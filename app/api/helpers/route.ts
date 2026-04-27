import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Helper from "@/lib/models/Helper";
import Patient from "@/lib/models/Patient";
import Survey from "@/lib/models/Survey";
import BlockCoordinator from "@/lib/models/BlockCoordinator";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await connectDB();
  const auth = await verifyAuth();
  const { searchParams } = new URL(req.url);
  const subDivision = searchParams.get("subDivision");
  const block = searchParams.get("block");
  const bcId = searchParams.get("blockCoordinatorId");
  const withCounts = searchParams.get("withCounts") === "true";

  const filter: any = {};
  if (subDivision) filter.subDivision = subDivision;
  if (block) filter.block = block;
  if (bcId) filter.blockCoordinatorId = bcId;
  if (auth?.role === "block-coordinator" && auth.id)
    filter.blockCoordinatorId = auth.id;

  const helpers = await Helper.find(filter)
    .populate("blockCoordinatorId", "name coordinatorId")
    .sort({ createdAt: -1 })
    .lean();

  // withCounts=true → ONE aggregation each for patient + survey counts
  // Instead of N+1 calls from frontend
  if (withCounts && helpers.length > 0) {
    const helperIds = helpers.map((h: any) => h._id);

    const [patientAgg, surveyAgg] = await Promise.all([
      Patient.aggregate([
        { $match: { helperId: { $in: helperIds } } },
        { $group: { _id: "$helperId", count: { $sum: 1 } } },
      ]),
      Survey.aggregate([
        { $match: { sbId: { $in: helperIds } } },
        { $group: { _id: "$sbId", count: { $sum: 1 } } },
      ]),
    ]);

    const pMap: Record<string, number> = {};
    const sMap: Record<string, number> = {};
    patientAgg.forEach((r: any) => { pMap[r._id.toString()] = r.count; });
    surveyAgg.forEach((r: any) => { sMap[r._id.toString()] = r.count; });

    return NextResponse.json(helpers.map((h: any) => ({
      ...h,
      patientCount: pMap[h._id.toString()] || 0,
      surveyCount: sMap[h._id.toString()] || 0,
    })));
  }

  return NextResponse.json(helpers);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || !["admin", "receptionist", "block-coordinator", "data-entry"].includes(auth.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  if (auth.role === "block-coordinator") {
    const bc = await BlockCoordinator.findById(auth.id).lean();
    if (!bc) return NextResponse.json({ error: "BC not found" }, { status: 404 });
    body.blockCoordinatorId = auth.id;
    body.subDivision = (bc as any).subDivision;
  }
  const helper = await Helper.create(body);
  const populated = await helper.populate("blockCoordinatorId", "name coordinatorId");
  return NextResponse.json(populated, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || !["admin", "receptionist", "block-coordinator"].includes(auth.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();
  const updated = await Helper.findByIdAndUpdate(id, body, { new: true })
    .populate("blockCoordinatorId", "name coordinatorId")
    .lean();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await Helper.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

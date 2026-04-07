import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Helper from "@/lib/models/Helper";
import BlockCoordinator from "@/lib/models/BlockCoordinator";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await connectDB();
  const auth = await verifyAuth();
  const { searchParams } = new URL(req.url);
  const subDivision = searchParams.get("subDivision");
  const block = searchParams.get("block");
  const bcId = searchParams.get("blockCoordinatorId");

  const filter: any = {};
  if (subDivision) filter.subDivision = subDivision;
  if (block) filter.block = block;
  if (bcId) filter.blockCoordinatorId = bcId;

  // BC: always restrict to own helpers only — server-side via JWT
  if (auth?.role === "block-coordinator" && auth.id) {
    filter.blockCoordinatorId = auth.id;
  }

  const helpers = await Helper.find(filter)
    .populate("blockCoordinatorId", "name coordinatorId")
    .sort({ createdAt: -1 });
  return NextResponse.json(helpers);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (
    !auth ||
    !["admin", "receptionist", "block-coordinator"].includes(auth.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const body = await req.json();

  // If BC is adding, auto-assign themselves as parent
  if (auth.role === "block-coordinator") {
    const bc = await BlockCoordinator.findById(auth.id);
    if (!bc)
      return NextResponse.json({ error: "BC not found" }, { status: 404 });
    body.blockCoordinatorId = auth.id;
    body.subDivision = bc.subDivision;
  }

  const helper = await Helper.create(body);
  const populated = await helper.populate(
    "blockCoordinatorId",
    "name coordinatorId",
  );
  return NextResponse.json(populated, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (
    !auth ||
    !["admin", "receptionist", "block-coordinator"].includes(auth.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();
  const updated = await Helper.findByIdAndUpdate(id, body, {
    new: true,
  }).populate("blockCoordinatorId", "name coordinatorId");
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

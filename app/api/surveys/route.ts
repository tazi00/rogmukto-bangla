import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Survey from "@/lib/models/Survey";
import Helper from "@/lib/models/Helper";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || !["admin", "data-entry", "block-coordinator"].includes(auth.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const sbId = searchParams.get("sbId");
  const subDivision = searchParams.get("subDivision");
  const block = searchParams.get("block");
  const sbSearch = searchParams.get("sbSearch"); // name or helperId
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Build helper filter first
  const helperFilter: any = {};
  if (subDivision) helperFilter.subDivision = subDivision;
  if (block) helperFilter.block = block;
  // BC can only see their own SBs
  if (auth.role === "block-coordinator" && auth.id)
    helperFilter.blockCoordinatorId = auth.id;

  // Resolve helper IDs from filter
  let filteredHelperIds: any[] | null = null;
  if (Object.keys(helperFilter).length > 0 || sbSearch) {
    const helperQuery: any = { ...helperFilter };
    if (sbSearch) {
      helperQuery.$or = [
        { name: { $regex: sbSearch, $options: "i" } },
        { helperId: { $regex: sbSearch, $options: "i" } },
      ];
    }
    const helpers = await Helper.find(helperQuery).select("_id").lean();
    filteredHelperIds = helpers.map((h: any) => h._id);
  }

  const filter: any = {};
  if (sbId) {
    filter.sbId = sbId;
  } else if (filteredHelperIds !== null) {
    filter.sbId = { $in: filteredHelperIds };
  }

  // data-entry sirf apne surveys dekhega
  if (auth.role === "data-entry" && auth.id) filter.createdBy = auth.id;

  if (dateFrom) filter.createdAt = { ...filter.createdAt, $gte: new Date(dateFrom) };
  if (dateTo) {
    const end = new Date(dateTo);
    end.setDate(end.getDate() + 1);
    filter.createdAt = { ...filter.createdAt, $lt: end };
  }

  const surveys = await Survey.find(filter)
    .populate({
      path: "sbId",
      select: "name helperId phone block subDivision blockCoordinatorId",
      populate: { path: "blockCoordinatorId", select: "name coordinatorId" },
    })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(surveys);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || !["admin", "data-entry"].includes(auth.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const survey = await Survey.create({
    ...body,
    createdBy: auth.id || null,
    createdByRole: auth.role === "admin" ? "admin" : "data-entry",
  });
  return NextResponse.json(survey, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();
  const updated = await Survey.findByIdAndUpdate(id, body, { new: true }).lean();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await Survey.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

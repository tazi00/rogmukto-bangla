import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Patient from "@/lib/models/Patient";
import Helper from "@/lib/models/Helper";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await connectDB();
  const auth = await verifyAuth();
  const { searchParams } = new URL(req.url);
  const helperId = searchParams.get("helperId");
  const month = searchParams.get("month");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "0");   // 0 = all (backward compat)
  const limit = parseInt(searchParams.get("limit") || "0"); // 0 = all

  // count-only mode for dashboard
  if (limit === 0 && searchParams.get("countOnly") === "true") {
    const count = await Patient.countDocuments({});
    return NextResponse.json({ count });
  }

  const filter: any = {};
  if (status) filter.paymentStatus = status;
  if (month) {
    const [year, m] = month.split("-").map(Number);
    filter.doa = { $gte: new Date(year, m - 1, 1), $lt: new Date(year, m, 1) };
  }

  if (auth?.role === "block-coordinator" && auth.id) {
    // Use lean + select for BC helper lookup — no full doc needed
    const bcHelperIds = await Helper.find({ blockCoordinatorId: auth.id })
      .select("_id")
      .lean();
    const ids = bcHelperIds.map((h: any) => h._id);
    if (helperId) {
      const isOwn = ids.some((id: any) => id.toString() === helperId);
      filter.helperId = isOwn ? helperId : null;
    } else {
      filter.helperId = { $in: ids };
    }
  } else {
    if (helperId) filter.helperId = helperId;
  }

  // Build query with lean() for plain JS objects — much faster than full Mongoose docs
  let query = Patient.find(filter)
    .populate({
      path: "helperId",
      select: "name block gramPanchayat subDivision tag blockCoordinatorId",
      populate: { path: "blockCoordinatorId", select: "name coordinatorId" },
    })
    .sort({ doa: -1 })
    .lean();

  // Server-side pagination if requested
  if (page > 0 && limit > 0) {
    query = query.skip((page - 1) * limit).limit(limit) as any;
  }

  const patients = await query;
  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || (auth.role !== "receptionist" && auth.role !== "admin"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const patient = await Patient.create(body);
  const populated = await patient.populate("helperId", "name block gramPanchayat subDivision tag");
  return NextResponse.json(populated, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || (auth.role !== "receptionist" && auth.role !== "admin"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();
  const updated = await Patient.findByIdAndUpdate(id, body, { new: true })
    .populate("helperId", "name block gramPanchayat subDivision tag")
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
  await Patient.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

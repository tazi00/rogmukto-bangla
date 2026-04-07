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

  const filter: any = {};
  if (status) filter.paymentStatus = status;
  if (month) {
    const [year, m] = month.split("-").map(Number);
    filter.doa = { $gte: new Date(year, m - 1, 1), $lt: new Date(year, m, 1) };
  }

  // BC: restrict to only their helpers' patients — enforced server-side via JWT
  if (auth?.role === "block-coordinator" && auth.id) {
    // Get all helpers under this BC
    const bcHelpers = await Helper.find({ blockCoordinatorId: auth.id }).select(
      "_id",
    );
    const bcHelperIds = bcHelpers.map((h) => h._id);
    // If a specific helperId is requested, make sure it belongs to this BC
    if (helperId) {
      const isOwn = bcHelperIds.some((id) => id.toString() === helperId);
      filter.helperId = isOwn ? helperId : null; // null = return empty if not own
    } else {
      filter.helperId = { $in: bcHelperIds };
    }
  } else {
    // Admin / receptionist: use helperId filter directly if provided
    if (helperId) filter.helperId = helperId;
  }

  const patients = await Patient.find(filter)
    .populate(
      "helperId",
      "name block gramPanchayat subDivision tag blockCoordinatorId",
    )
    .sort({ createdAt: -1 });
  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || (auth.role !== "receptionist" && auth.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const body = await req.json();
  const patient = await Patient.create(body);
  const populated = await patient.populate(
    "helperId",
    "name block gramPanchayat subDivision tag",
  );
  return NextResponse.json(populated, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || (auth.role !== "receptionist" && auth.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();
  const updated = await Patient.findByIdAndUpdate(id, body, {
    new: true,
  }).populate("helperId", "name block gramPanchayat subDivision tag");
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || (auth.role !== "receptionist" && auth.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await Patient.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

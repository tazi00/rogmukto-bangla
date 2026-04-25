import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Survey from "@/lib/models/Survey";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || !["admin", "data-entry"].includes(auth.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const sbId = searchParams.get("sbId");
  const filter: any = {};
  if (sbId) filter.sbId = sbId;
  // data-entry sirf apne surveys dekhega
  if (auth.role === "data-entry" && auth.id) filter.createdBy = auth.id;
  const surveys = await Survey.find(filter)
    .populate("sbId", "name helperId phone")
    .sort({ createdAt: -1 });
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
  const updated = await Survey.findByIdAndUpdate(id, body, { new: true });
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

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DataEntryOperator from "@/lib/models/DataEntryOperator";
import { verifyAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const list = await DataEntryOperator.find({}, "-password").sort({ createdAt: -1 });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { name, username, password } = await req.json();
  const exists = await DataEntryOperator.findOne({ username });
  if (exists)
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  const hashed = await bcrypt.hash(password, 10);
  const op = await DataEntryOperator.create({ name, username, password: hashed, plainPassword: password });
  return NextResponse.json({ _id: op._id, name: op.name, username: op.username }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const { name, username, password } = await req.json();
  const update: any = { name, username };
  if (password) {
    update.password = await bcrypt.hash(password, 10);
    update.plainPassword = password;
  }
  const updated = await DataEntryOperator.findByIdAndUpdate(id, update, { new: true }).select("-password");
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await DataEntryOperator.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

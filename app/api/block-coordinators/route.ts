import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlockCoordinator from "@/lib/models/BlockCoordinator";
import { verifyAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("me"); // for BC getting own info
  const auth = await verifyAuth();

  if (auth?.role === "block-coordinator") {
    const bc = await BlockCoordinator.findById(auth.id).select("-password");
    return NextResponse.json(bc ? [bc] : []);
  }

  const data = await BlockCoordinator.find()
    .select("-password")
    .sort({ createdAt: -1 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const exists = await BlockCoordinator.findOne({
    coordinatorId: body.coordinatorId,
  });
  if (exists)
    return NextResponse.json(
      { error: "Coordinator ID already exists" },
      { status: 400 },
    );
  const userExists = await BlockCoordinator.findOne({
    username: body.username,
  });
  if (userExists)
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 400 },
    );
  const hashed = await bcrypt.hash(body.password, 10);
  const bc = await BlockCoordinator.create({
    ...body,
    password: hashed,
    plainPassword: body.password,
  });
  const { password: _, ...safe } = bc.toObject();
  return NextResponse.json(safe, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();
  const update: any = { ...body };
  if (body.password) {
    update.password = await bcrypt.hash(body.password, 10);
    update.plainPassword = body.password; // ⚠️ update raw
  } else {
    delete update.password;
    delete update.plainPassword;
  }
  const updated = await BlockCoordinator.findByIdAndUpdate(id, update, {
    new: true,
  }).select("-password");
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await BlockCoordinator.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

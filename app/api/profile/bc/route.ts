import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlockCoordinator from "@/lib/models/BlockCoordinator";
import { verifyAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET — return own profile info
export async function GET() {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "block-coordinator") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const bc = await BlockCoordinator.findById(auth.id).select(
    "name username coordinatorId subDivision blocks",
  );
  if (!bc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bc);
}

// PUT — change own password
export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "block-coordinator") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Both fields required" },
      { status: 400 },
    );
  }
  const bc = await BlockCoordinator.findById(auth.id);
  if (!bc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify using plainPassword (as per existing pattern)
  if (bc.plainPassword !== currentPassword) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  bc.plainPassword = newPassword;
  bc.password = await bcrypt.hash(newPassword, 10);
  await bc.save();
  return NextResponse.json({ success: true });
}

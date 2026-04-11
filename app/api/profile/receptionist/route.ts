import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Receptionist from "@/lib/models/Receptionist";
import { verifyAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET — return own profile info
export async function GET() {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "receptionist") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const rec = await Receptionist.findById(auth.id).select("name username");
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rec);
}

// PUT — change own password
export async function PUT(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth || auth.role !== "receptionist") {
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
  const rec = await Receptionist.findById(auth.id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify using plainPassword
  if (rec.plainPassword !== currentPassword) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  rec.plainPassword = newPassword;
  rec.password = await bcrypt.hash(newPassword, 10);
  await rec.save();
  return NextResponse.json({ success: true });
}

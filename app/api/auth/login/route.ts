import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Receptionist from "@/lib/models/Receptionist";
import BlockCoordinator from "@/lib/models/BlockCoordinator";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

const cookieOpts = (maxAge = 60 * 60 * 24 * 7) => ({
  httpOnly: false, // role_hint is readable by client JS
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge,
  path: "/",
});

const authCookieOpts = {
  httpOnly: true, // auth_token stays httpOnly
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  // Admin check
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = signToken({ role: "admin", username });
    const res = NextResponse.json({ success: true, role: "admin" });
    res.cookies.set("auth_token", token, authCookieOpts);
    res.cookies.set("role_hint", "admin", cookieOpts());
    res.cookies.delete("bc_id");
    return res;
  }

  await connectDB();

  // Block Coordinator check
  const bc = await BlockCoordinator.findOne({ username });
  if (bc) {
    const valid = await bcrypt.compare(password, bc.password);
    if (!valid)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    const token = signToken({
      role: "block-coordinator",
      id: bc._id.toString(),
      username,
    });
    const res = NextResponse.json({ success: true, role: "block-coordinator" });
    res.cookies.set("auth_token", token, authCookieOpts);
    res.cookies.set("role_hint", "block-coordinator", cookieOpts());
    res.cookies.set("bc_id", bc._id.toString(), cookieOpts());
    return res;
  }

  // Receptionist check
  const receptionist = await Receptionist.findOne({ username });
  if (!receptionist)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const valid = await bcrypt.compare(password, receptionist.password);
  if (!valid)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const token = signToken({
    role: "receptionist",
    id: receptionist._id.toString(),
    username,
  });
  const res = NextResponse.json({ success: true, role: "receptionist" });
  res.cookies.set("auth_token", token, authCookieOpts);
  res.cookies.set("role_hint", "receptionist", cookieOpts());
  res.cookies.delete("bc_id");
  return res;
}

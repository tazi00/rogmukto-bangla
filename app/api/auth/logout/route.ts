import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
  res.cookies.set("role_hint", "", { maxAge: 0, path: "/" });
  res.cookies.set("bc_id", "", { maxAge: 0, path: "/" });
  return res;
}

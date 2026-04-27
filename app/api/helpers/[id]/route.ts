import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Helper from "@/lib/models/Helper";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const helper = await Helper.findById(params.id)
    .populate("blockCoordinatorId", "name coordinatorId")
    .lean();
  if (!helper) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(helper);
}

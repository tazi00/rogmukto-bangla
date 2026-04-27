import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Helper from "@/lib/models/Helper";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDB();
  const helper = await Helper.findById(id)
    .populate("blockCoordinatorId", "name coordinatorId")
    .lean();
  if (!helper) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(helper);
}

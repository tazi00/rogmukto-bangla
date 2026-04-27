import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Patient from "@/lib/models/Patient";
import Helper from "@/lib/models/Helper";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await connectDB();
  const auth = await verifyAuth();
  const { searchParams } = new URL(req.url);
  const subDivision = searchParams.get("subDivision");
  const block = searchParams.get("block");
  const gramPanchayat = searchParams.get("gramPanchayat");
  const month = searchParams.get("month");
  const helperId = searchParams.get("helperId");

  let endOfMonth: Date | null = null;
  let startOfMonth: Date | null = null;
  if (month) {
    const [year, m] = month.split("-").map(Number);
    startOfMonth = new Date(year, m - 1, 1);
    endOfMonth = new Date(year, m, 1);
  }

  const helperFilter: any = {};
  if (subDivision) helperFilter.subDivision = subDivision;
  if (block) helperFilter.block = block;
  if (gramPanchayat) helperFilter.gramPanchayat = gramPanchayat;
  if (helperId) helperFilter._id = helperId;
  // Note: No createdAt filter on helpers — show ALL SBs regardless of when they were created
  if (auth?.role === "block-coordinator" && auth.id)
    helperFilter.blockCoordinatorId = auth.id;

  // lean() — plain JS objects, no Mongoose overhead
  const helpers = await Helper.find(helperFilter)
    .populate("blockCoordinatorId", "name coordinatorId")
    .lean();

  if (helpers.length === 0) return NextResponse.json([]);

  const helperIds = helpers.map((h: any) => h._id);

  // Use aggregation pipeline instead of find + JS grouping
  // This runs entirely in MongoDB — much faster for large datasets
  const patientFilter: any = { helperId: { $in: helperIds } };
  if (startOfMonth && endOfMonth) {
    patientFilter.doa = { $gte: startOfMonth, $lt: endOfMonth };
  }

  const patientAgg = await Patient.aggregate([
    { $match: patientFilter },
    {
      $group: {
        _id: "$helperId",
        totalPatients: { $sum: 1 },
        totalIncentive: { $sum: "$incentiveAmount" },
        pendingIncentive: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$incentiveAmount", 0] }
        },
        clearedIncentive: {
          $sum: { $cond: [{ $ne: ["$paymentStatus", "pending"] }, "$incentiveAmount", 0] }
        },
      }
    }
  ]);

  // Map aggregation results
  const statsMap: Record<string, any> = {};
  patientAgg.forEach((r: any) => { statsMap[r._id.toString()] = r; });

  const result = helpers.map((helper: any) => {
    const stats = statsMap[helper._id.toString()] || {
      totalPatients: 0, totalIncentive: 0, pendingIncentive: 0, clearedIncentive: 0
    };
    return {
      helper: {
        _id: helper._id,
        helperId: helper.helperId || "",
        name: helper.name,
        phone: helper.phone,
        subDivision: helper.subDivision,
        block: helper.block,
        gramPanchayat: helper.gramPanchayats?.[0]?.gpName || helper.municipalities?.[0]?.municipalityName || "—",
        gramPanchayats: helper.gramPanchayats || [],
        municipalities: helper.municipalities || [],
        tag: helper.tag,
        doj: helper.doj,
        createdAt: helper.createdAt,
        blockCoordinatorId: helper.blockCoordinatorId,
      },
      totalPatients: stats.totalPatients,
      totalIncentive: stats.totalIncentive,
      pendingIncentive: stats.pendingIncentive,
      clearedIncentive: stats.clearedIncentive,
    };
  });

  return NextResponse.json(result);
}

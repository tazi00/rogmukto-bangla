import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlockCoordinator from "@/lib/models/BlockCoordinator";
import Helper from "@/lib/models/Helper";
import Patient from "@/lib/models/Patient";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  let startOfMonth: Date | null = null;
  let endOfMonth: Date | null = null;
  if (month) {
    const [year, m] = month.split("-").map(Number);
    startOfMonth = new Date(year, m - 1, 1);
    endOfMonth = new Date(year, m, 1);
  }

  // Run all 3 queries in parallel — was sequential before
  const [bcs, helpers, patientAgg] = await Promise.all([
    BlockCoordinator.find(endOfMonth ? { createdAt: { $lt: endOfMonth } } : {})
      .select("-password -plainPassword")
      .sort({ name: 1 })
      .lean(),

    Helper.find(endOfMonth ? { createdAt: { $lt: endOfMonth } } : {})
      .select("_id blockCoordinatorId")
      .lean(),

    // Aggregation pipeline — group patients by helperId in MongoDB
    // Then we join with helperToBc map in JS
    Patient.aggregate([
      ...(startOfMonth && endOfMonth
        ? [{ $match: { doa: { $gte: startOfMonth, $lt: endOfMonth } } }]
        : []),
      {
        $group: {
          _id: "$helperId",
          total: { $sum: 1 },
          totalIncentive: { $sum: "$incentiveAmount" },
          pending: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$incentiveAmount", 0] }
          },
          cleared: {
            $sum: { $cond: [{ $ne: ["$paymentStatus", "pending"] }, "$incentiveAmount", 0] }
          },
        }
      }
    ]),
  ]);

  // Build lookup maps in JS
  const helperToBc: Record<string, string> = {};
  const bcHelperCount: Record<string, number> = {};

  for (const h of helpers as any[]) {
    const bcId = h.blockCoordinatorId?.toString();
    if (!bcId) continue;
    helperToBc[h._id.toString()] = bcId;
    bcHelperCount[bcId] = (bcHelperCount[bcId] || 0) + 1;
  }

  // Aggregate patient stats per BC
  const bcStats: Record<string, { total: number; totalIncentive: number; pending: number; cleared: number }> = {};
  for (const p of patientAgg) {
    const bcId = helperToBc[p._id?.toString()];
    if (!bcId) continue;
    if (!bcStats[bcId]) bcStats[bcId] = { total: 0, totalIncentive: 0, pending: 0, cleared: 0 };
    bcStats[bcId].total += p.total;
    bcStats[bcId].totalIncentive += p.totalIncentive;
    bcStats[bcId].pending += p.pending;
    bcStats[bcId].cleared += p.cleared;
  }

  const result = (bcs as any[]).map((bc) => {
    const bcId = bc._id.toString();
    const stats = bcStats[bcId] || { total: 0, totalIncentive: 0, pending: 0, cleared: 0 };
    return {
      _id: bc._id,
      coordinatorId: bc.coordinatorId,
      name: bc.name,
      phone: bc.phone,
      subDivision: bc.subDivision,
      blocks: bc.blocks,
      address: bc.address,
      createdAt: bc.createdAt,
      sbCount: bcHelperCount[bcId] || 0,
      totalPatients: stats.total,
      totalIncentive: stats.totalIncentive,
      pendingIncentive: stats.pending,
      clearedIncentive: stats.cleared,
    };
  });

  return NextResponse.json(result);
}

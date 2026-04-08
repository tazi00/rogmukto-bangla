import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlockCoordinator from "@/lib/models/BlockCoordinator";
import Helper from "@/lib/models/Helper";
import Patient from "@/lib/models/Patient";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  // End of selected month — BCs/SBs created BEFORE this date are shown
  let endOfMonth: Date | null = null;
  if (month) {
    const [year, m] = month.split("-").map(Number);
    endOfMonth = new Date(year, m, 1); // start of NEXT month = end of selected month
  }

  // BCs created up to end of selected month
  const bcFilter: any = {};
  if (endOfMonth) bcFilter.createdAt = { $lt: endOfMonth };
  const bcs = await BlockCoordinator.find(bcFilter)
    .select("-password")
    .sort({ name: 1 });

  // SBs created up to end of selected month
  const helperFilter: any = {};
  if (endOfMonth) helperFilter.createdAt = { $lt: endOfMonth };
  const helpers = await Helper.find(helperFilter).select(
    "_id blockCoordinatorId helperId name createdAt",
  );

  // Patients — only within selected month (DOA)
  const patientFilter: any = {};
  if (month) {
    const [year, m] = month.split("-").map(Number);
    patientFilter.doa = {
      $gte: new Date(year, m - 1, 1),
      $lt: new Date(year, m, 1),
    };
  }
  const patients = await Patient.find(patientFilter).select(
    "helperId incentiveAmount paymentStatus",
  );

  // Map helperId -> bcId
  const helperToBc: Record<string, string> = {};
  const bcHelperMap: Record<string, any[]> = {};
  for (const h of helpers) {
    const bcId = h.blockCoordinatorId?.toString();
    if (bcId) {
      helperToBc[h._id.toString()] = bcId;
      if (!bcHelperMap[bcId]) bcHelperMap[bcId] = [];
      bcHelperMap[bcId].push(h);
    }
  }

  // Aggregate patients per BC (only from SBs that existed at that time)
  const bcPatientStats: Record<
    string,
    { total: number; totalIncentive: number; pending: number; cleared: number }
  > = {};
  for (const p of patients) {
    const hid = (p.helperId as any)?.toString();
    const bcId = helperToBc[hid];
    if (!bcId) continue;
    if (!bcPatientStats[bcId])
      bcPatientStats[bcId] = {
        total: 0,
        totalIncentive: 0,
        pending: 0,
        cleared: 0,
      };
    bcPatientStats[bcId].total++;
    bcPatientStats[bcId].totalIncentive += p.incentiveAmount || 0;
    if (p.paymentStatus === "pending")
      bcPatientStats[bcId].pending += p.incentiveAmount || 0;
    else bcPatientStats[bcId].cleared += p.incentiveAmount || 0;
  }

  const result = bcs.map((bc) => {
    const bcId = bc._id.toString();
    const bcHelpers = bcHelperMap[bcId] || [];
    const stats = bcPatientStats[bcId] || {
      total: 0,
      totalIncentive: 0,
      pending: 0,
      cleared: 0,
    };
    return {
      _id: bc._id,
      coordinatorId: bc.coordinatorId,
      name: bc.name,
      phone: bc.phone,
      subDivision: bc.subDivision,
      blocks: bc.blocks,
      address: bc.address,
      createdAt: bc.createdAt,
      sbCount: bcHelpers.length,
      totalPatients: stats.total,
      totalIncentive: stats.totalIncentive,
      pendingIncentive: stats.pending,
      clearedIncentive: stats.cleared,
    };
  });

  return NextResponse.json(result);
}

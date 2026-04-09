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
  const month = searchParams.get("month"); // YYYY-MM
  const helperId = searchParams.get("helperId");

  // End of selected month — SBs created BEFORE this are shown
  let endOfMonth: Date | null = null;
  if (month) {
    const [year, m] = month.split("-").map(Number);
    endOfMonth = new Date(year, m, 1); // start of next month
  }

  // Build helper filter
  const helperFilter: any = {};
  if (subDivision) helperFilter.subDivision = subDivision;
  if (block) helperFilter.block = block;
  if (gramPanchayat) helperFilter.gramPanchayat = gramPanchayat;
  if (helperId) helperFilter._id = helperId;
  // Filter SBs created up to end of selected month
  if (endOfMonth) helperFilter.createdAt = { $lt: endOfMonth };

  // BC: restrict to own helpers only — enforced server-side via JWT
  if (auth?.role === "block-coordinator" && auth.id) {
    helperFilter.blockCoordinatorId = auth.id;
  }

  const helpers = await Helper.find(helperFilter).populate(
    "blockCoordinatorId",
    "name coordinatorId",
  );
  const helperIds = helpers.map((h) => h._id);

  // Patients — only within selected month (DOA)
  const patientFilter: any = { helperId: { $in: helperIds } };
  if (month) {
    const [year, m] = month.split("-").map(Number);
    patientFilter.doa = {
      $gte: new Date(year, m - 1, 1),
      $lt: new Date(year, m, 1),
    };
  }

  const patients = await Patient.find(patientFilter).populate("helperId");

  // Group by helper
  const reportMap: Record<string, any> = {};
  for (const helper of helpers) {
    reportMap[helper._id.toString()] = {
      helper: {
        _id: helper._id,
        helperId: helper.helperId || "",
        name: helper.name,
        phone: helper.phone,
        subDivision: helper.subDivision,
        block: helper.block,
        gramPanchayat:
          helper.gramPanchayats?.[0]?.gpName ||
          helper.municipalities?.[0]?.municipalityName ||
          "—",
        tag: helper.tag,
        createdAt: helper.createdAt,
        blockCoordinatorId: helper.blockCoordinatorId,
      },
      patients: [],
      totalPatients: 0,
      totalIncentive: 0,
      pendingIncentive: 0,
      clearedIncentive: 0,
    };
  }

  for (const patient of patients) {
    const hid =
      (patient.helperId as any)._id?.toString() || patient.helperId.toString();
    if (!reportMap[hid]) continue;
    reportMap[hid].patients.push(patient);
    reportMap[hid].totalPatients++;
    reportMap[hid].totalIncentive += patient.incentiveAmount;
    if (patient.paymentStatus === "pending") {
      reportMap[hid].pendingIncentive += patient.incentiveAmount;
    } else {
      reportMap[hid].clearedIncentive += patient.incentiveAmount;
    }
  }

  return NextResponse.json(Object.values(reportMap));
}

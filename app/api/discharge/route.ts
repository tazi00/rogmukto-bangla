import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Patient from '@/lib/models/Patient'
import { verifyAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || !['admin', 'receptionist', 'block-coordinator'].includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { patientId, action, blockingAmount, dischargeAmount } = await req.json()

  if (action === 'continue') {
    const updated = await Patient.findByIdAndUpdate(patientId, {
      dischargeStatus: 'continued',
      dischargeDate: new Date(),
      blockingAmount: blockingAmount || 0,
      dischargeAmount: dischargeAmount || 0,
      incentiveDisabled: false,
    }, { new: true }).populate('helperId', 'name block gramPanchayats tag')
    return NextResponse.json(updated)
  }

  if (action === 'transfer') {
    const updated = await Patient.findByIdAndUpdate(patientId, {
      dischargeStatus: 'transferred',
      dischargeDate: new Date(),
      incentiveDisabled: true,
      incentiveAmount: 0,
    }, { new: true }).populate('helperId', 'name block gramPanchayats tag')
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

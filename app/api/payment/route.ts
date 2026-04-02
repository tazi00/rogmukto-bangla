import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Patient from '@/lib/models/Patient'
import { verifyAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || (auth.role !== 'admin' && auth.role !== 'receptionist')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { patientId, status, paymentDetail } = await req.json()
  const updated = await Patient.findByIdAndUpdate(
    patientId,
    { paymentStatus: status, paymentDetail },
    { new: true }
  ).populate('helperId', 'name block gramPanchayat subDivision tag')
  return NextResponse.json(updated)
}

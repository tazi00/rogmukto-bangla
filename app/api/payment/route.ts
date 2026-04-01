import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Patient from '@/lib/models/Patient'
import { verifyAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { patientIds, status } = await req.json()
  await Patient.updateMany(
    { _id: { $in: patientIds } },
    { paymentStatus: status }
  )
  return NextResponse.json({ success: true })
}

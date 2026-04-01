import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Patient from '@/lib/models/Patient'
import { verifyAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const helperId = searchParams.get('helperId')
  const month = searchParams.get('month') // format: YYYY-MM
  const status = searchParams.get('status')

  const filter: any = {}
  if (helperId) filter.helperId = helperId
  if (status) filter.paymentStatus = status
  if (month) {
    const [year, m] = month.split('-').map(Number)
    filter.doa = {
      $gte: new Date(year, m - 1, 1),
      $lt: new Date(year, m, 1),
    }
  }

  const patients = await Patient.find(filter)
    .populate('helperId', 'name block gramPanchayat subDivision tag')
    .sort({ createdAt: -1 })
  return NextResponse.json(patients)
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || (auth.role !== 'receptionist' && auth.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const patient = await Patient.create(body)
  const populated = await patient.populate('helperId', 'name block gramPanchayat subDivision tag')
  return NextResponse.json(populated, { status: 201 })
}

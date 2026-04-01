import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Helper from '@/lib/models/Helper'
import { verifyAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const subDivision = searchParams.get('subDivision')
  const block = searchParams.get('block')
  const gramPanchayat = searchParams.get('gramPanchayat')

  const filter: any = {}
  if (subDivision) filter.subDivision = subDivision
  if (block) filter.block = block
  if (gramPanchayat) filter.gramPanchayat = gramPanchayat

  const helpers = await Helper.find(filter).sort({ createdAt: -1 })
  return NextResponse.json(helpers)
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const helper = await Helper.create(body)
  return NextResponse.json(helper, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  await Helper.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}

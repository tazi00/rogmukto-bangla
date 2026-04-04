import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Helper from '@/lib/models/Helper'
import { verifyAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const subDivision = searchParams.get('subDivision')
  const block = searchParams.get('block')
  const bcId = searchParams.get('blockCoordinatorId')
  const filter: any = {}
  if (subDivision) filter.subDivision = subDivision
  if (block) filter.block = block
  if (bcId) filter.blockCoordinatorId = bcId
  const helpers = await Helper.find(filter)
    .populate('blockCoordinatorId', 'name coordinatorId')
    .sort({ createdAt: -1 })
  return NextResponse.json(helpers)
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || (auth.role !== 'admin' && auth.role !== 'receptionist')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const body = await req.json()
  const helper = await Helper.create(body)
  const populated = await helper.populate('blockCoordinatorId', 'name coordinatorId')
  return NextResponse.json(populated, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || (auth.role !== 'admin' && auth.role !== 'receptionist')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const body = await req.json()
  const updated = await Helper.findByIdAndUpdate(id, body, { new: true })
    .populate('blockCoordinatorId', 'name coordinatorId')
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  await Helper.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}

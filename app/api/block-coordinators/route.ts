import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import BlockCoordinator from '@/lib/models/BlockCoordinator'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  await connectDB()
  const data = await BlockCoordinator.find().sort({ createdAt: -1 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const body = await req.json()
  const exists = await BlockCoordinator.findOne({ coordinatorId: body.coordinatorId })
  if (exists) return NextResponse.json({ error: 'Coordinator ID already exists' }, { status: 400 })
  const bc = await BlockCoordinator.create(body)
  return NextResponse.json(bc, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const body = await req.json()
  const updated = await BlockCoordinator.findByIdAndUpdate(id, body, { new: true })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  await BlockCoordinator.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}

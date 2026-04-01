import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Receptionist from '@/lib/models/Receptionist'
import { verifyAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const list = await Receptionist.find({}, '-password').sort({ createdAt: -1 })
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { name, username, password } = await req.json()
  const hashed = await bcrypt.hash(password, 10)
  const rec = await Receptionist.create({ name, username, password: hashed })
  return NextResponse.json({ _id: rec._id, name: rec.name, username: rec.username }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  await Receptionist.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}

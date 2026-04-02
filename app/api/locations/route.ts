import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import SubDivision from '@/lib/models/Location'
import { verifyAuth } from '@/lib/auth'

// GET - fetch all locations (public, used in dropdowns everywhere)
export async function GET() {
  await connectDB()
  const data = await SubDivision.find().sort({ name: 1 })
  return NextResponse.json(data)
}

// POST - add subdivision / block / gp
export async function POST(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { type, name, subDivisionId, blockId } = await req.json()

  if (type === 'subdivision') {
    const existing = await SubDivision.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
    if (existing) return NextResponse.json({ error: 'Already exists' }, { status: 400 })
    const sd = await SubDivision.create({ name, blocks: [] })
    return NextResponse.json(sd, { status: 201 })
  }

  if (type === 'block') {
    const sd = await SubDivision.findById(subDivisionId)
    if (!sd) return NextResponse.json({ error: 'SubDivision not found' }, { status: 404 })
    const exists = sd.blocks.some((b: any) => b.name.toLowerCase() === name.toLowerCase())
    if (exists) return NextResponse.json({ error: 'Block already exists' }, { status: 400 })
    sd.blocks.push({ name, gramPanchayats: [] })
    await sd.save()
    return NextResponse.json(sd, { status: 201 })
  }

  if (type === 'gp') {
    const sd = await SubDivision.findById(subDivisionId)
    if (!sd) return NextResponse.json({ error: 'SubDivision not found' }, { status: 404 })
    const block = sd.blocks.id(blockId)
    if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    const exists = block.gramPanchayats.some((g: any) => g.name.toLowerCase() === name.toLowerCase())
    if (exists) return NextResponse.json({ error: 'GP already exists' }, { status: 400 })
    block.gramPanchayats.push({ name })
    await sd.save()
    return NextResponse.json(sd, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

// DELETE - remove subdivision / block / gp
export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { type, subDivisionId, blockId, gpId } = await req.json()

  if (type === 'subdivision') {
    await SubDivision.findByIdAndDelete(subDivisionId)
    return NextResponse.json({ success: true })
  }

  const sd = await SubDivision.findById(subDivisionId)
  if (!sd) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (type === 'block') {
    sd.blocks = sd.blocks.filter((b: any) => b._id.toString() !== blockId)
    await sd.save()
    return NextResponse.json({ success: true })
  }

  if (type === 'gp') {
    const block = sd.blocks.id(blockId)
    if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    block.gramPanchayats = block.gramPanchayats.filter((g: any) => g._id.toString() !== gpId)
    await sd.save()
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

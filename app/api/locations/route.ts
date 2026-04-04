import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import SubDivision from '@/lib/models/Location'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  await connectDB()
  const data = await SubDivision.find().sort({ name: 1 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { type, name, subDivisionId, blockId, gpId, munId } = await req.json()

  if (type === 'subdivision') {
    const existing = await SubDivision.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
    if (existing) return NextResponse.json({ error: 'Already exists' }, { status: 400 })
    const sd = await SubDivision.create({ name, blocks: [] })
    return NextResponse.json(sd, { status: 201 })
  }

  const sd = await SubDivision.findById(subDivisionId)
  if (!sd) return NextResponse.json({ error: 'SubDivision not found' }, { status: 404 })

  if (type === 'block') {
    const exists = sd.blocks.some((b: any) => b.name.toLowerCase() === name.toLowerCase())
    if (exists) return NextResponse.json({ error: 'Block already exists' }, { status: 400 })
    sd.blocks.push({ name, gramPanchayats: [], municipalities: [] })
    await sd.save()
    return NextResponse.json(sd, { status: 201 })
  }

  const block = sd.blocks.id(blockId)
  if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

  if (type === 'gp') {
    const exists = block.gramPanchayats.some((g: any) => g.name.toLowerCase() === name.toLowerCase())
    if (exists) return NextResponse.json({ error: 'GP already exists' }, { status: 400 })
    block.gramPanchayats.push({ name, villages: [] })
    await sd.save()
    return NextResponse.json(sd, { status: 201 })
  }

  if (type === 'municipality') {
    const exists = block.municipalities.some((m: any) => m.name.toLowerCase() === name.toLowerCase())
    if (exists) return NextResponse.json({ error: 'Municipality already exists' }, { status: 400 })
    block.municipalities.push({ name, wards: [] })
    await sd.save()
    return NextResponse.json(sd, { status: 201 })
  }

  if (type === 'village') {
    const gp = block.gramPanchayats.id(gpId)
    if (!gp) return NextResponse.json({ error: 'GP not found' }, { status: 404 })
    const exists = gp.villages.some((v: any) => v.name.toLowerCase() === name.toLowerCase())
    if (exists) return NextResponse.json({ error: 'Village already exists' }, { status: 400 })
    gp.villages.push({ name })
    await sd.save()
    return NextResponse.json(sd, { status: 201 })
  }

  if (type === 'ward') {
    const mun = block.municipalities.id(munId)
    if (!mun) return NextResponse.json({ error: 'Municipality not found' }, { status: 404 })
    const exists = mun.wards.some((w: any) => w.name.toLowerCase() === name.toLowerCase())
    if (exists) return NextResponse.json({ error: 'Ward already exists' }, { status: 400 })
    mun.wards.push({ name })
    await sd.save()
    return NextResponse.json(sd, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { type, subDivisionId, blockId, gpId, munId, villageId, wardId } = await req.json()

  if (type === 'subdivision') {
    await SubDivision.findByIdAndDelete(subDivisionId)
    return NextResponse.json({ success: true })
  }

  const sd = await SubDivision.findById(subDivisionId)
  if (!sd) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (type === 'block') {
    sd.blocks = sd.blocks.filter((b: any) => b._id.toString() !== blockId)
    await sd.save(); return NextResponse.json({ success: true })
  }

  const block = sd.blocks.id(blockId)
  if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

  if (type === 'gp') {
    block.gramPanchayats = block.gramPanchayats.filter((g: any) => g._id.toString() !== gpId)
    await sd.save(); return NextResponse.json({ success: true })
  }

  if (type === 'municipality') {
    block.municipalities = block.municipalities.filter((m: any) => m._id.toString() !== munId)
    await sd.save(); return NextResponse.json({ success: true })
  }

  if (type === 'village') {
    const gp = block.gramPanchayats.id(gpId)
    if (!gp) return NextResponse.json({ error: 'GP not found' }, { status: 404 })
    gp.villages = gp.villages.filter((v: any) => v._id.toString() !== villageId)
    await sd.save(); return NextResponse.json({ success: true })
  }

  if (type === 'ward') {
    const mun = block.municipalities.id(munId)
    if (!mun) return NextResponse.json({ error: 'Municipality not found' }, { status: 404 })
    mun.wards = mun.wards.filter((w: any) => w._id.toString() !== wardId)
    await sd.save(); return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

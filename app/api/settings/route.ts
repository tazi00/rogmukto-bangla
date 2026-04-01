import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Settings from '@/lib/models/Settings'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  await connectDB()
  let settings = await Settings.findOne()
  if (!settings) settings = await Settings.create({ defaultIncentiveAmount: 200 })
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { defaultIncentiveAmount } = await req.json()
  let settings = await Settings.findOne()
  if (!settings) {
    settings = await Settings.create({ defaultIncentiveAmount })
  } else {
    settings.defaultIncentiveAmount = defaultIncentiveAmount
    await settings.save()
  }
  return NextResponse.json(settings)
}

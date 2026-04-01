import mongoose, { Schema, Document } from 'mongoose'

export interface IHelper extends Document {
  name: string
  phone: string
  subDivision: string
  block: string
  gramPanchayat: string
  village: string
  tag: string
  createdAt: Date
}

const HelperSchema = new Schema<IHelper>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  subDivision: { type: String, required: true },
  block: { type: String, required: true },
  gramPanchayat: { type: String, required: true },
  village: { type: String, default: '' },
  tag: { type: String, default: 'Swasthya Bondhu' },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Helper || mongoose.model<IHelper>('Helper', HelperSchema)

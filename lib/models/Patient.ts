import mongoose, { Schema, Document } from 'mongoose'

export interface IPaymentDetail {
  mode: 'cash' | 'online' | ''
  remarks: string
  denominations?: { note: number; count: number }[]
}

export interface IPatient extends Document {
  name: string
  mobile: string
  ipdNo: string
  doa: Date
  helperId: mongoose.Types.ObjectId
  incentiveAmount: number
  paymentStatus: 'pending' | 'clearance'
  paymentDetail: IPaymentDetail
  createdAt: Date
}

const PatientSchema = new Schema<IPatient>({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  ipdNo: { type: String, required: true },
  doa: { type: Date, required: true },
  helperId: { type: Schema.Types.ObjectId, ref: 'Helper', required: true },
  incentiveAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'clearance'], default: 'pending' },
  paymentDetail: {
    mode: { type: String, enum: ['cash', 'online', ''], default: '' },
    remarks: { type: String, default: '' },
    denominations: [{ note: Number, count: Number }],
  },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema)

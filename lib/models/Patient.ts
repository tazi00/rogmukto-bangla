import mongoose, { Schema, Document } from 'mongoose'

export interface IPaymentDetail {
  mode: 'cash' | 'online' | ''
  remarks: string
  denominations?: { note: number; count: number }[]
}

export interface IPatientAddress {
  type: 'gp' | 'municipality' | ''
  subDivision: string; subDivisionId: string
  block: string; blockId: string
  gramPanchayat: string; village: string
  municipality: string; ward: string
}

export interface IPatient extends Document {
  name: string; mobile: string; ipdNo: string; doa: Date
  helperId: mongoose.Types.ObjectId
  incentiveAmount: number
  pincode: string
  aadharNumber: string
  swasthaSathNumber: string
  address: IPatientAddress
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
  pincode: { type: String, default: '' },
  aadharNumber: { type: String, default: '' },
  swasthaSathNumber: { type: String, default: '' },
  address: {
    type: { type: String, enum: ['gp', 'municipality', ''], default: '' },
    subDivision: { type: String, default: '' }, subDivisionId: { type: String, default: '' },
    block: { type: String, default: '' }, blockId: { type: String, default: '' },
    gramPanchayat: { type: String, default: '' }, village: { type: String, default: '' },
    municipality: { type: String, default: '' }, ward: { type: String, default: '' },
  },
  paymentStatus: { type: String, enum: ['pending', 'clearance'], default: 'pending' },
  paymentDetail: {
    mode: { type: String, enum: ['cash', 'online', ''], default: '' },
    remarks: { type: String, default: '' },
    denominations: [{ note: Number, count: Number }],
  },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema)

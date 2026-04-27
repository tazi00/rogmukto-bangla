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
  pincode: string; aadharNumber: string; swasthaSathNumber: string
  address: IPatientAddress
  paymentStatus: 'pending' | 'clearance'
  paymentDetail: IPaymentDetail
  dischargeStatus: 'admitted' | 'continued' | 'transferred'
  dischargeDate: Date | null
  blockingAmount: number
  dischargeAmount: number
  incentiveDisabled: boolean
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
  dischargeStatus: { type: String, enum: ['admitted', 'continued', 'transferred'], default: 'admitted' },
  dischargeDate: { type: Date, default: null },
  blockingAmount: { type: Number, default: 0 },
  dischargeAmount: { type: Number, default: 0 },
  incentiveDisabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

// ── Indexes ────────────────────────────────────────────────────────────────
// Most common query: fetch patients by helperId
PatientSchema.index({ helperId: 1 })
// Filter by month (doa range queries)
PatientSchema.index({ doa: -1 })
// Combined: helperId + doa — most used in reports & sb detail page
PatientSchema.index({ helperId: 1, doa: -1 })
// Payment filter
PatientSchema.index({ paymentStatus: 1 })
// Discharge status filter
PatientSchema.index({ dischargeStatus: 1 })
// BC performance queries: helperId + paymentStatus
PatientSchema.index({ helperId: 1, paymentStatus: 1 })

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema)

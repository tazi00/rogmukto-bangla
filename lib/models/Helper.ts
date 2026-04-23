import mongoose, { Schema, Document } from 'mongoose'

export interface IGPAssignment { gpName: string; villages: string[] }
export interface IMunAssignment { municipalityName: string; wards: string[] }

export interface IHelper extends Document {
  helperId: string
  name: string
  phone: string
  blockCoordinatorId: mongoose.Types.ObjectId
  subDivision: string
  block: string
  gramPanchayats: IGPAssignment[]
  municipalities: IMunAssignment[]
  tag: string
  doj: Date
  createdAt: Date
}

const GPAssignmentSchema = new Schema<IGPAssignment>({ gpName: { type: String, required: true }, villages: [{ type: String }] })
const MunAssignmentSchema = new Schema<IMunAssignment>({ municipalityName: { type: String, required: true }, wards: [{ type: String }] })

const HelperSchema = new Schema<IHelper>({
  helperId: { type: String, default: '' },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  blockCoordinatorId: { type: Schema.Types.ObjectId, ref: 'BlockCoordinator', required: true },
  subDivision: { type: String, required: true },
  block: { type: String, required: true },
  gramPanchayats: [GPAssignmentSchema],
  municipalities: [MunAssignmentSchema],
  tag: { type: String, default: 'Swasthya Bondhu' },
  doj: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Helper || mongoose.model<IHelper>('Helper', HelperSchema)

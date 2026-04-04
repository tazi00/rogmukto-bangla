import mongoose, { Schema, Document } from 'mongoose'

export interface IBlockCoordinator extends Document {
  coordinatorId: string
  name: string
  phone: string
  subDivision: string
  blocks: string[]
  address: string
  createdAt: Date
}

const BlockCoordinatorSchema = new Schema<IBlockCoordinator>({
  coordinatorId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  subDivision: { type: String, required: true },
  blocks: [{ type: String }],
  address: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.BlockCoordinator || mongoose.model<IBlockCoordinator>('BlockCoordinator', BlockCoordinatorSchema)

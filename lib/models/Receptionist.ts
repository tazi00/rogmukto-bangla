import mongoose, { Schema, Document } from 'mongoose'

export interface IReceptionist extends Document {
  name: string
  username: string
  password: string
  createdAt: Date
}

const ReceptionistSchema = new Schema<IReceptionist>({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Receptionist || mongoose.model<IReceptionist>('Receptionist', ReceptionistSchema)

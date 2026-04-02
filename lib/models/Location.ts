import mongoose, { Schema, Document } from 'mongoose'

export interface IGramPanchayat {
  _id?: mongoose.Types.ObjectId
  name: string
}

export interface IBlock {
  _id?: mongoose.Types.ObjectId
  name: string
  gramPanchayats: IGramPanchayat[]
}

export interface ISubDivision extends Document {
  name: string
  blocks: IBlock[]
}

const GPSchema = new Schema<IGramPanchayat>({ name: { type: String, required: true } })
const BlockSchema = new Schema<IBlock>({ name: { type: String, required: true }, gramPanchayats: [GPSchema] })
const SubDivisionSchema = new Schema<ISubDivision>({ name: { type: String, required: true, unique: true }, blocks: [BlockSchema] })

export default mongoose.models.SubDivision || mongoose.model<ISubDivision>('SubDivision', SubDivisionSchema)

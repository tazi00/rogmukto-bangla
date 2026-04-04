import mongoose, { Schema, Document } from 'mongoose'

export interface IVillage { _id?: mongoose.Types.ObjectId; name: string }
export interface IWard { _id?: mongoose.Types.ObjectId; name: string }
export interface IGramPanchayat { _id?: mongoose.Types.ObjectId; name: string; villages: IVillage[] }
export interface IMunicipality { _id?: mongoose.Types.ObjectId; name: string; wards: IWard[] }
export interface IBlock {
  _id?: mongoose.Types.ObjectId
  name: string
  gramPanchayats: IGramPanchayat[]
  municipalities: IMunicipality[]
}
export interface ISubDivision extends Document {
  name: string
  blocks: IBlock[]
}

const VillageSchema = new Schema<IVillage>({ name: { type: String, required: true } })
const WardSchema = new Schema<IWard>({ name: { type: String, required: true } })
const GPSchema = new Schema<IGramPanchayat>({ name: { type: String, required: true }, villages: [VillageSchema] })
const MunicipalitySchema = new Schema<IMunicipality>({ name: { type: String, required: true }, wards: [WardSchema] })
const BlockSchema = new Schema<IBlock>({
  name: { type: String, required: true },
  gramPanchayats: [GPSchema],
  municipalities: [MunicipalitySchema],
})
const SubDivisionSchema = new Schema<ISubDivision>({
  name: { type: String, required: true, unique: true },
  blocks: [BlockSchema],
})

export default mongoose.models.SubDivision || mongoose.model<ISubDivision>('SubDivision', SubDivisionSchema)

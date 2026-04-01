import mongoose, { Schema, Document } from 'mongoose'

export interface ISettings extends Document {
  defaultIncentiveAmount: number
}

const SettingsSchema = new Schema<ISettings>({
  defaultIncentiveAmount: { type: Number, default: 200 },
})

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema)

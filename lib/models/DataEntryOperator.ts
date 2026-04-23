import mongoose, { Schema, Document } from "mongoose";

export interface IDataEntryOperator extends Document {
  name: string;
  username: string;
  password: string;
  plainPassword: string;
  createdAt: Date;
}

const DataEntryOperatorSchema = new Schema<IDataEntryOperator>({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.DataEntryOperator ||
  mongoose.model<IDataEntryOperator>("DataEntryOperator", DataEntryOperatorSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface IBlockCoordinator extends Document {
  coordinatorId: string;
  name: string;
  phone: string;
  subDivision: string;
  blocks: string[];
  address: string;
  username: string;
  password: string;
  plainPassword: string;
  createdAt: Date;
}

const BlockCoordinatorSchema = new Schema<IBlockCoordinator>({
  coordinatorId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  subDivision: { type: String, required: true },
  blocks: [{ type: String }],
  address: { type: String, default: "" },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// ── Indexes ────────────────────────────────────────────────────────────────
BlockCoordinatorSchema.index({ subDivision: 1 })
BlockCoordinatorSchema.index({ createdAt: -1 })

export default mongoose.models.BlockCoordinator ||
  mongoose.model<IBlockCoordinator>("BlockCoordinator", BlockCoordinatorSchema);

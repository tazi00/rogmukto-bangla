import mongoose, { Schema, Document } from "mongoose";

export interface IHealthIssue {
  whose: string;       // naam ya relation e.g. "Grandfather"
  age: number;
  type: "serious" | "within_1_month" | "within_2_months" | "others";
}

export interface ISurvey extends Document {
  sbId: mongoose.Types.ObjectId;         // ref: Helper
  createdBy: mongoose.Types.ObjectId;    // ref: DataEntryOperator
  createdByRole: "data-entry" | "admin";
  familyName: string;
  village: string;
  ward: string;
  // Members count
  membersM: number;
  membersF: number;
  childM: number;
  childF: number;
  above65M: number;
  above65F: number;
  // Health issues
  healthIssueDetected: boolean;
  healthIssues: IHealthIssue[];
  createdAt: Date;
}

const HealthIssueSchema = new Schema<IHealthIssue>({
  whose: { type: String, required: true },
  age: { type: Number, required: true },
  type: {
    type: String,
    enum: ["serious", "within_1_month", "within_2_months", "others"],
    required: true,
  },
});

const SurveySchema = new Schema<ISurvey>({
  sbId: { type: Schema.Types.ObjectId, ref: "Helper", required: true },
  createdBy: { type: Schema.Types.ObjectId, refPath: "createdByRole" },
  createdByRole: { type: String, enum: ["data-entry", "admin"], default: "data-entry" },
  familyName: { type: String, required: true },
  village: { type: String, default: "" },
  ward: { type: String, default: "" },
  membersM: { type: Number, default: 0 },
  membersF: { type: Number, default: 0 },
  childM: { type: Number, default: 0 },
  childF: { type: Number, default: 0 },
  above65M: { type: Number, default: 0 },
  above65F: { type: Number, default: 0 },
  healthIssueDetected: { type: Boolean, default: false },
  healthIssues: [HealthIssueSchema],
  createdAt: { type: Date, default: Date.now },
});

// Index for fast lookup by SB
SurveySchema.index({ sbId: 1, createdAt: -1 });

export default mongoose.models.Survey || mongoose.model<ISurvey>("Survey", SurveySchema);

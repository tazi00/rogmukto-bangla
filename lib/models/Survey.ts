import mongoose, { Schema, Document } from "mongoose";

export interface IHealthIssue {
  whose: string;
  age: number;
  type: "serious" | "within_1_month" | "within_2_months" | "others";
}

export interface ISurvey extends Document {
  sbId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdByRole: "data-entry" | "admin";
  familyName: string;
  mobile: string;
  whatsapp: string;
  village: string;
  ward: string;
  membersM: number;
  membersF: number;
  childM: number;
  childF: number;
  above65M: number;
  above65F: number;
  healthIssueDetected: boolean;
  healthIssues: IHealthIssue[];
  createdAt: Date;
  updatedAt: Date;
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
  mobile: { type: String, default: "" },
  whatsapp: { type: String, default: "" },
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
}, { timestamps: true });

SurveySchema.index({ sbId: 1, createdAt: -1 });

export default mongoose.models.Survey || mongoose.model<ISurvey>("Survey", SurveySchema);

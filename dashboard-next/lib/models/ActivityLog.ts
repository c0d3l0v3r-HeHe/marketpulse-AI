import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  competitorId: mongoose.Types.ObjectId;
  competitorName: string;
  status: "running" | "success" | "error";
  message: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    competitorId: { type: Schema.Types.ObjectId, ref: "Competitor", required: true },
    competitorName: { type: String, required: true },
    status: { type: String, enum: ["running", "success", "error"], required: true },
    message: { type: String, default: "" },
  },
  { timestamps: true }
);

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ?? mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;

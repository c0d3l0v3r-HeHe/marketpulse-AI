import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICompetitor extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  notes: string;
  lastAnalyzed: Date | null;
  latestReport: {
    summary: string;
    sentiment: string;
    sentimentScore: number;
    topPrices: { title: string; price: string; url: string }[];
    keyInsights: string[];
    recommendation: string;
    rawMarkdown: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSchema = new Schema<ICompetitor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    notes: { type: String, default: "", maxlength: 5000 },
    lastAnalyzed: { type: Date, default: null },
    latestReport: {
      type: {
        summary: String,
        sentiment: String,
        sentimentScore: Number,
        topPrices: [{ title: String, price: String, url: String }],
        keyInsights: [String],
        recommendation: String,
        rawMarkdown: String,
      },
      default: null,
    },
  },
  { timestamps: true }
);

const Competitor: Model<ICompetitor> =
  mongoose.models.Competitor ?? mongoose.model<ICompetitor>("Competitor", CompetitorSchema);

export default Competitor;
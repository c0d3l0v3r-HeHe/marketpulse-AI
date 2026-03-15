import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ActivityLog from "@/lib/models/ActivityLog";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

function getUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch { return null; }
}

// GET /api/activity — last 30 logs for user
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const logs = await ActivityLog.find({ userId: user.userId })
    .sort({ createdAt: -1 })
    .limit(30);

  return NextResponse.json({ logs });
}
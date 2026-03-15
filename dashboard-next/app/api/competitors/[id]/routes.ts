import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Competitor from "@/lib/models/Competitor";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; name: string; email: string };
  } catch {
    return null;
  }
}

// GET /api/competitors — list all for user
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const competitors = await Competitor.find({ userId: user.userId }).sort({ createdAt: -1 });
  return NextResponse.json({ competitors });
}

// POST /api/competitors — create new
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { name, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ message: "Name required" }, { status: 400 });

  await connectDB();
  const competitor = await Competitor.create({ userId: user.userId, name: name.trim(), notes: notes ?? "" });
  return NextResponse.json({ competitor }, { status: 201 });
}

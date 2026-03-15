import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Competitor from "@/lib/models/Competitor";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// PUT /api/competitors/[id] — update
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, notes } = await req.json();

  await connectDB();
  const competitor = await Competitor.findOneAndUpdate(
    { _id: id, userId: user.userId },
    { name, notes },
    { new: true }
  );

  if (!competitor) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ competitor });
}

// DELETE /api/competitors/[id] — delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  await Competitor.findOneAndDelete({ _id: id, userId: user.userId });
  return NextResponse.json({ message: "Deleted" });
}

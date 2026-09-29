import { NextRequest, NextResponse } from "next/server";
import { findSimilar } from "@/lib/ai/similar";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const similar = await findSimilar(id).catch(() => []);
  return NextResponse.json(similar);
}
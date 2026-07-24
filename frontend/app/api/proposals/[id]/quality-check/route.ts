import { NextRequest, NextResponse } from "next/server";
const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";
type Context = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, { params }: Context) {
  const { id } = await params;
  const response = await fetch(`${AI_SERVER_URL}/api/v1/proposals/${id}/quality-check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await req.json()) });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}

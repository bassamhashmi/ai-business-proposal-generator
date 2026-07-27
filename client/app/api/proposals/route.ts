import { NextRequest, NextResponse } from "next/server";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const response = await fetch(`${AI_SERVER_URL}/api/v1/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await req.json()),
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

export async function GET() {
  const response = await fetch(`${AI_SERVER_URL}/api/v1/proposals`);
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

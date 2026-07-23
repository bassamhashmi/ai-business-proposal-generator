import { NextRequest, NextResponse } from "next/server";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await fetch(`${AI_SERVER_URL}/api/v1/research-company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Research failed" }, { status: 502 });
  }
  return NextResponse.json(await response.json());
}

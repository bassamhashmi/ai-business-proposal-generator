import { NextRequest, NextResponse } from "next/server";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Context) {
  const { id } = await params;
  const response = await fetch(`${AI_SERVER_URL}/api/v1/proposals/${id}`);
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const { id } = await params;
  const response = await fetch(`${AI_SERVER_URL}/api/v1/proposals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await req.json()),
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

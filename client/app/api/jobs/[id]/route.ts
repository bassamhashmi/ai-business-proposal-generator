import { NextRequest, NextResponse } from "next/server";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Context) {
  const { id } = await params;
  const response = await fetch(`${AI_SERVER_URL}/api/v1/jobs/${id}`);
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(_: NextRequest, { params }: Context) {
  const { id } = await params;
  const response = await fetch(`${AI_SERVER_URL}/api/v1/jobs/${id}`, {
    method: "DELETE",
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

import { NextRequest, NextResponse } from "next/server";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const aiServerResponse = await fetch(
    `${AI_SERVER_URL}/api/v1/generate-proposal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!aiServerResponse.ok) {
    return NextResponse.json({ error: "AI server error" }, { status: 500 });
  }

  const data = await aiServerResponse.json();

  console.log(">>> data: ", data);

  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from "next/server";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const response = await fetch(`${AI_SERVER_URL}/api/v1/export-docx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Export failed" }, { status: 502 });
  }

  const blob = await response.arrayBuffer();
  return new NextResponse(blob, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition":
        response.headers.get("Content-Disposition") || "attachment",
    },
  });
}

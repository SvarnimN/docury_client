import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const API = process.env.API;

  const { url, sessionId } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "No link provided" }, { status: 400 });
  }

  const backendRes = await fetch(`${API}/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, session_id: sessionId }),
  });

  const data = await backendRes.json();
  
  return NextResponse.json(data);
}

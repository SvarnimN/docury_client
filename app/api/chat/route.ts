import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const API = process.env.API;

  const { message, sessionId } = await req.json();

  const backendRes = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: message, session_id: sessionId }),
  });

  const data = await backendRes.json();
  
  return NextResponse.json(data);
}

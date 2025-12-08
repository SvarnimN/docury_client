import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const API = process.env.API;
  const form = await req.formData();
  const file = form.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const backendRes = await fetch(`${API}/upload`, {
    method: "POST",
    body: form,
  });

  const data = await backendRes.json();
  
  return NextResponse.json(data);
}

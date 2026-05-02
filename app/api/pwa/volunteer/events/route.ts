import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const url = new URL(`${API_URL}/api/volunteer/events`);
    if (email) url.searchParams.set("email", email);

    const res = await fetch(url.toString(), {
      headers: authHeader ? { Authorization: authHeader } : {},
      cache: "no-store",
    });

    const bodyText = await res.text();
    console.log(`Backend GET /api/volunteer/events response: ${res.status} ${bodyText}`);
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch volunteer events" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const page = url.searchParams.get("page") || "1";
    const limit = url.searchParams.get("limit") || "30";

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
    }

    const upstreamUrl = `${API_URL}/api/notifications?email=${encodeURIComponent(email)}&page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`;
    const authHeader = request.headers.get("authorization");

    const res = await fetch(upstreamUrl, {
      method: "GET",
      headers: authHeader ? { Authorization: authHeader } : undefined,
      cache: "no-store",
    });

    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const payload = await request.json();

    const res = await fetch(`${API_URL}/api/notifications/mark-read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 502 });
  }
}

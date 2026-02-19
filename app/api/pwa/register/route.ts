import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const bodyText = await res.text();
    let data: any = null;
    try {
      data = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      data = { message: bodyText };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || data?.message || "Registration failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data ?? { success: true }, { status: 200 });
  } catch (error) {
    console.error("[register] Error:", error);
    return NextResponse.json(
      { error: "Failed to process registration. Backend unreachable or invalid response." },
      { status: 500 }
    );
  }
}

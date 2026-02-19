import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL || "http://localhost:8000").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.message || "Registration failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[register] Error:", error);
    return NextResponse.json(
      { error: "Failed to process registration" },
      { status: 500 }
    );
  }
}

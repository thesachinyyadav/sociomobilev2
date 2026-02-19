import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/api\/?$/, "").replace(/\/$/, "");

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const res = await fetch(
      `${API_URL}/api/notifications/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`,
      {
        method: "DELETE",
        headers: authHeader ? { Authorization: authHeader } : undefined,
        cache: "no-store",
      }
    );

    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to dismiss notification" }, { status: 502 });
  }
}

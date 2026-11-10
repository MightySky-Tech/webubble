import { NextRequest, NextResponse } from "next/server";

const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Cross-origin catalogue request rejected." }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL("/api/v1/catalogue/preview", apiOrigin), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { message: "Catalogue preview service is unavailable. Please try again." },
        { status: 502 },
      );
    }
    throw error;
  }

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "Catalogue service returned an invalid response." }, { status: 502 });
    }
    throw error;
  }

  return NextResponse.json(payload, {
    status: upstream.status,
    headers: { "Cache-Control": "no-store" },
  });
}

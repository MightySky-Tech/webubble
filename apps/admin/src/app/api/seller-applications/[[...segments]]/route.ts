import { NextRequest, NextResponse } from "next/server";

const accessCookie = "webubble_access_token";
const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";

async function handle(request: NextRequest): Promise<NextResponse> {
  const segments = request.nextUrl.pathname.split("/").slice(3).filter(Boolean);
  const path = segments.join("/");
  const isList = path === "" && request.method === "GET";
  const isReview = /^\d+\/review$/.test(path) && request.method === "POST";
  const isEvidence = /^\d+\/evidence$/.test(path) && request.method === "GET";
  if (!isList && !isReview && !isEvidence) {
    return NextResponse.json({ message: "Seller application route not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Cross-origin review request rejected." }, { status: 403 });
  }
  const token = request.cookies.get(accessCookie)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const headers = new Headers({
    Accept: isEvidence ? "application/octet-stream" : "application/json",
    Authorization: `Bearer ${token}`,
  });
  let body: string | undefined;
  if (isReview) {
    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
      }
      throw error;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ message: "Request body must be a JSON object." }, { status: 400 });
    }
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(parsed);
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL(`/api/v1/admin/seller-applications/${path}`, apiOrigin), {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { message: "Seller review service is unavailable. Please try again." },
        { status: 502 },
      );
    }
    throw error;
  }

  if (isEvidence && upstream.ok) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment",
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "Seller service returned an invalid response." }, { status: 502 });
    }
    throw error;
  }
  return NextResponse.json(payload, { status: upstream.status });
}

export const GET = handle;
export const POST = handle;

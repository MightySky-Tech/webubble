import { NextRequest, NextResponse } from "next/server";

const accessCookie = "webubble_access_token";
const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";
const methods: Record<string, string> = {
  "otp/request": "POST",
  "otp/verify": "POST",
  "mfa/setup": "GET",
  "mfa/verify": "POST",
  me: "GET",
  logout: "DELETE",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname.split("/").slice(3).join("/");
  if (methods[path] !== request.method) {
    return NextResponse.json({ message: "Authentication route not found." }, { status: 404 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Cross-origin authentication request rejected." }, { status: 403 });
  }

  let body: Record<string, unknown> | undefined;
  if (request.method === "POST") {
    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
      }
      throw error;
    }
    if (!isRecord(parsed)) {
      return NextResponse.json({ message: "Request body must be a JSON object." }, { status: 400 });
    }
    body = parsed;
  }

  const token = request.cookies.get(accessCookie)?.value;
  const headers = new Headers({ Accept: "application/json" });
  if (body) {
    headers.set("Content-Type", "application/json");
  }
  if (token && (path === "me" || path === "logout" || path.startsWith("mfa/"))) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const apiPath = path.startsWith("mfa/")
    ? `/api/v1/admin/${path}`
    : `/api/v1/auth/${path}`;
  let upstream: Response;
  try {
    upstream = await fetch(new URL(apiPath, apiOrigin), {
      method: request.method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { message: "Authentication service is unavailable. Please try again." },
        { status: 502 },
      );
    }
    throw error;
  }

  if (upstream.status === 204) {
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(accessCookie, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: "Authentication service returned an invalid response." },
        { status: 502 },
      );
    }
    throw error;
  }

  if ((path === "otp/verify" || path === "mfa/verify") && upstream.ok) {
    if (!isRecord(payload) || typeof payload.token !== "string" || payload.token.length === 0) {
      return NextResponse.json(
        { message: "Authentication service did not issue a valid session." },
        { status: 502 },
      );
    }
    const { token: accessToken, ...publicPayload } = payload;
    const response = NextResponse.json(publicPayload, { status: upstream.status });
    const cookieLifetime = path === "mfa/verify"
      ? 60 * 60 * 12
      : isRecord(publicPayload) && publicPayload.admin_mfa_required === true
        ? 60 * 10
        : 60 * 60 * 24 * 30;
    response.cookies.set(accessCookie, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: cookieLifetime,
    });
    return response;
  }

  return NextResponse.json(payload, { status: upstream.status });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

import { NextRequest, NextResponse } from "next/server";

const accessCookie = "webubble_access_token";
const pendingEmailCookie = "webubble_pending_email";
const pendingIntentCookie = "webubble_pending_intent";
const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";
const methods: Record<string, string> = {
  "otp/request": "POST",
  "otp/resend": "POST",
  "otp/verify": "POST",
  me: "GET",
  logout: "DELETE",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clearPendingCookies(response: NextResponse): void {
  for (const name of [pendingEmailCookie, pendingIntentCookie]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname.split("/").slice(3).join("/");
  if (methods[path] !== request.method) {
    return NextResponse.json({ message: "Authentication route not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (origin && !origin.includes(request.nextUrl.host)) {
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

  const pendingEmail = request.cookies.get(pendingEmailCookie)?.value;
  const pendingIntent = request.cookies.get(pendingIntentCookie)?.value;
  if (path === "otp/verify" || path === "otp/resend") {
    if (!pendingEmail || (pendingIntent !== "register" && pendingIntent !== "login")) {
      return NextResponse.json({ message: "Request a new verification code first." }, { status: 400 });
    }
    body = { ...body, email: pendingEmail, intent: pendingIntent };
  }

  const headers = new Headers({ Accept: "application/json" });
  if (body) headers.set("Content-Type", "application/json");
  const token = request.cookies.get(accessCookie)?.value;
  if (token && (path === "me" || path === "logout")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL(`/api/v1/auth/${path}`, apiOrigin), {
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
    if (path === "logout") {
      response.cookies.set(accessCookie, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
    }
    return response;
  }

  const responseText = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: "Authentication service returned an invalid response." },
        { status: 502 },
      );
    }
    throw error;
  }

  if (path === "otp/verify" && upstream.ok) {
    if (!isRecord(payload) || typeof payload.token !== "string" || payload.token.length === 0) {
      return NextResponse.json(
        { message: "Authentication service did not issue a valid session." },
        { status: 502 },
      );
    }

    const { token: accessToken, ...publicPayload } = payload;
    const response = NextResponse.json(publicPayload, { status: upstream.status });
    response.cookies.set(accessCookie, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    clearPendingCookies(response);
    return response;
  }

  const response = NextResponse.json(payload, { status: upstream.status });
  if (path === "otp/request" && upstream.status === 202 && isRecord(body)) {
    if (
      typeof body.email === "string"
      && (body.intent === "register" || body.intent === "login")
    ) {
      const options = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
      };
      response.cookies.set(pendingEmailCookie, body.email.toLowerCase(), options);
      response.cookies.set(pendingIntentCookie, body.intent, options);
    }
  }
  if (path === "me" && upstream.status === 401) {
    response.cookies.set(accessCookie, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

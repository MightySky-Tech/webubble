import { NextRequest, NextResponse } from "next/server";

const accessCookie = "webubble_access_token";
const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";
const routes: Record<string, { method: string; apiPath: string }> = {
  me: { method: "GET", apiPath: "/api/v1/seller/me" },
  onboarding: { method: "POST", apiPath: "/api/v1/seller/onboarding" },
};

async function handle(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname.split("/").slice(3).join("/");
  const route = routes[path];
  if (!route || route.method !== request.method) {
    return NextResponse.json({ message: "Seller route not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Cross-origin seller request rejected." }, { status: 403 });
  }

  const token = request.cookies.get(accessCookie)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  let body: FormData | undefined;
  if (request.method === "POST") {
    try {
      body = await request.formData();
    } catch (error) {
      if (error instanceof TypeError) {
        return NextResponse.json({ message: "Request body must be valid form data." }, { status: 400 });
      }
      throw error;
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL(route.apiPath, apiOrigin), {
      method: route.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { message: "Seller service is unavailable. Please try again." },
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
      return NextResponse.json(
        { message: "Seller service returned an invalid response." },
        { status: 502 },
      );
    }
    throw error;
  }

  return NextResponse.json(payload, { status: upstream.status });
}

export const GET = handle;
export const POST = handle;

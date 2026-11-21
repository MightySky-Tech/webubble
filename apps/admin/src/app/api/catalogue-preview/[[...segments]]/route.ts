import { NextRequest, NextResponse } from "next/server";

const accessCookie = "webubble_access_token";
const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";

async function handle(request: NextRequest): Promise<NextResponse> {
  const segments = request.nextUrl.pathname.split("/").slice(3).filter(Boolean);
  const path = segments.join("/");
  const isList = path === "" && request.method === "GET";
  const isCreate = path === "" && request.method === "POST";
  const isUpdate = /^\d+$/.test(path) && request.method === "PUT";
  const isDelete = /^\d+$/.test(path) && request.method === "DELETE";
  if (!isList && !isCreate && !isUpdate && !isDelete) {
    return NextResponse.json({ message: "Catalogue preview route not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Cross-origin catalogue request rejected." }, { status: 403 });
  }

  const token = request.cookies.get(accessCookie)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  });
  let body: string | undefined;
  if (isCreate || isUpdate) {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
      }
      throw error;
    }
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return NextResponse.json({ message: "Request body must be a JSON object." }, { status: 400 });
    }
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(payload);
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL(`/api/v1/admin/catalogue/preview/${path}`, apiOrigin), {
      method: request.method,
      headers,
      body,
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

  if (upstream.status === 204) return new NextResponse(null, { status: 204 });
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

  return NextResponse.json(payload, { status: upstream.status });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;

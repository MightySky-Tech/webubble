import { NextRequest, NextResponse } from "next/server";

const accessCookie = "webubble_access_token";
const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";

async function handle(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname.split("/").slice(3).filter(Boolean).join("/");
  const isList = path === "" && request.method === "GET";
  const isCategoryList = path === "categories" && request.method === "GET";
  const isCategoryCreate = path === "categories" && request.method === "POST";
  const isCategoryUpdate = /^categories\/\d+$/.test(path) && request.method === "PATCH";
  const isReview = /^\d+\/review$/.test(path) && request.method === "POST";
  const isMedia = /^\d+\/media\/\d+$/.test(path) && request.method === "GET";
  if (!isList && !isCategoryList && !isCategoryCreate && !isCategoryUpdate && !isReview && !isMedia) {
    return NextResponse.json({ message: "Product administration route not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Cross-origin product administration request rejected." }, { status: 403 });
  }
  const token = request.cookies.get(accessCookie)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const headers = new Headers({
    Accept: isMedia ? "image/*" : "application/json",
    Authorization: `Bearer ${token}`,
  });
  let body: string | undefined;
  if (isCategoryCreate || isCategoryUpdate || isReview) {
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

  const apiPath = isCategoryList || isCategoryCreate || isCategoryUpdate
    ? `/api/v1/admin/product-categories/${path.replace(/^categories\/?/, "")}`
    : `/api/v1/admin/products/${path}`;
  let upstream: Response;
  try {
    upstream = await fetch(new URL(apiPath, apiOrigin), {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { message: "Product administration service is unavailable. Please try again." },
        { status: 502 },
      );
    }
    throw error;
  }

  if (isMedia && upstream.ok) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: "Product administration service returned an invalid response." },
        { status: 502 },
      );
    }
    throw error;
  }

  return NextResponse.json(payload, { status: upstream.status });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;

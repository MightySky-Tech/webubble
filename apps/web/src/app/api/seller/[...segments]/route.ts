import { NextRequest, NextResponse } from "next/server";

const accessCookie = "webubble_access_token";
const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";

async function handle(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname.split("/").slice(3).join("/");
  const isMe = path === "me" && request.method === "GET";
  const isOnboarding = path === "onboarding" && request.method === "POST";
  const isProductList = path === "products" && ["GET", "POST"].includes(request.method);
  const isProductUpdate = /^products\/\d+$/.test(path) && ["PUT", "DELETE"].includes(request.method);
  const isProductSubmit = /^products\/\d+\/submit$/.test(path) && request.method === "POST";
  const isProductMedia = /^products\/\d+\/media\/\d+$/.test(path) && request.method === "GET";
  const isFormRequest = isOnboarding
    || (request.method === "POST" && isProductList)
    || (request.method === "PUT" && isProductUpdate);
  if (!isMe && !isOnboarding && !isProductList && !isProductUpdate && !isProductSubmit && !isProductMedia) {
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
  if (isFormRequest) {
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
    upstream = await fetch(new URL(`/api/v1/seller/${path}`, apiOrigin), {
      method: request.method,
      headers: {
        Accept: isProductMedia ? "image/*" : "application/json",
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

  if (isProductMedia && upstream.ok) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
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
export const PUT = handle;
export const DELETE = handle;

import { NextRequest, NextResponse } from "next/server";

const apiOrigin = process.env.WEBUBBLE_API_URL ?? "http://localhost:8100";

async function handle(request: NextRequest): Promise<NextResponse> {
  if (request.method !== "GET") {
    return NextResponse.json({ message: "Catalogue route not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Cross-origin catalogue request rejected." }, { status: 403 });
  }

  const path = request.nextUrl.pathname.split("/").slice(3).filter(Boolean).join("/");
  const isCategories = path === "categories";
  const isProducts = path === "products";
  const isProductMedia = /^products\/\d+\/media\/\d+$/.test(path);
  if (!isCategories && !isProducts && !isProductMedia) {
    return NextResponse.json({ message: "Catalogue route not found." }, { status: 404 });
  }

  const target = new URL(`/api/v1/catalogue/${path}`, apiOrigin);
  if (isProducts) {
    for (const key of ["category", "q", "page"]) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) target.searchParams.set(key, value);
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { Accept: isProductMedia ? "image/*" : "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json({ message: "Catalogue service is unavailable. Please try again." }, { status: 502 });
    }
    throw error;
  }

  if (isProductMedia && upstream.ok) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": upstream.headers.get("cache-control") ?? "public, max-age=3600",
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
      return NextResponse.json({ message: "Catalogue service returned an invalid response." }, { status: 502 });
    }
    throw error;
  }

  return NextResponse.json(payload, {
    status: upstream.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export const GET = handle;

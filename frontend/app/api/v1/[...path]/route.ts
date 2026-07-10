import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "https://route53-clone-backend-1jhp.onrender.com";

// Runtime proxy for all /api/v1/* requests → Render backend
// Reading BACKEND_URL at RUNTIME (not build time) is the key difference
// from next.config.js rewrites, which evaluate env vars at build time only.
async function proxyToBackend(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/v1/${path}${search}`;

  // Forward all incoming headers except host (causes SSL issues if forwarded)
  const headers = new Headers(request.headers);
  headers.delete("host");

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  try {
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // Disable Next.js fetch cache for API proxy calls
      cache: "no-store",
    });

    const responseHeaders = new Headers(backendResponse.headers);
    
    // fetch() automatically decompresses the response body.
    // If we pass the original content-encoding header back to the browser, 
    // the browser tries to decompress already-decompressed JSON and fails with ERR_CONTENT_DECODING_FAILED.
    // We must also remove content-length since the uncompressed size differs.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    // Expose Content-Disposition so file downloads work
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Disposition");

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch {
    // Backend is sleeping (Render free tier cold start) or unreachable
    return NextResponse.json(
      {
        detail:
          "Backend is starting up. Please wait ~30 seconds and try again.",
        code: "BACKEND_COLD_START",
      },
      { status: 503 }
    );
  }
}

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const DELETE = proxyToBackend;
export const PATCH = proxyToBackend;
export const OPTIONS = proxyToBackend;

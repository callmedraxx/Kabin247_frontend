import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  // Proxy runs on the server, so we can't access localStorage
  // Authentication checks are handled client-side in the admin layout
  // This proxy just allows all routes - the client will redirect if needed
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.png (icon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)",
  ],
}

import { NextResponse, type NextRequest } from "next/server";

import { PATHNAME_HEADER } from "@/server/shared/login-redirect";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    PATHNAME_HEADER,
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Só páginas: fora API, internals do Next e arquivos estáticos (têm extensão).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

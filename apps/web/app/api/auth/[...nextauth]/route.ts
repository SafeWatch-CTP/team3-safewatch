import { handlers } from "@project/auth/auth";
import type { NextRequest } from "next/server";
import { NextRequest as ServerRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  let authRequest = request;

  if (requestUrl.pathname === "/api/auth/callback/github") {
    const issuer = requestUrl.searchParams.get("iss");
    if (issuer && issuer !== "https://github.com/login/oauth") {
      return Response.redirect(new URL("/?error=OAuthCallbackError", requestUrl));
    }

    if (issuer) {
      requestUrl.searchParams.delete("iss");
      authRequest = new ServerRequest(requestUrl, request);
    }
  }

  const response = await handlers.GET(authRequest);

  if (
    requestUrl.pathname !== "/api/auth/callback/github" ||
    requestUrl.searchParams.get("error") !== "access_denied" ||
    response.status < 300 ||
    response.status >= 400
  ) {
    return response;
  }

  const location = response.headers.get("location");
  if (!location) return response;

  const redirectUrl = new URL(location, requestUrl);
  if (redirectUrl.origin !== requestUrl.origin || redirectUrl.pathname !== "/") {
    return response;
  }

  redirectUrl.searchParams.set("error", "OAuthAccessDenied");
  const headers = new Headers(response.headers);
  headers.set("location", redirectUrl.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const POST = handlers.POST;

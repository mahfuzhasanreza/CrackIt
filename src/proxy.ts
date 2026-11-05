// Next 16 "proxy" (formerly middleware): optimistic auth redirect for every app route.
// Real authorization happens in the DAL (src/modules/auth/dal.ts) and every Server Action.
export { auth as proxy } from "@/auth";

export const config = {
  // Everything except Auth.js endpoints, the health check, Next internals and static files.
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};

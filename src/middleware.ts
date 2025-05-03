import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/api/trpc/(.*)",
  "/api/agents(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // For API routes, we'll handle authentication in the route handlers
  if (!isPublicRoute(req) && !req.url.includes("/api/")) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

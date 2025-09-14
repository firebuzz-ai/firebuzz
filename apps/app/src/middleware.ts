import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
	"/",
	"/join(.*)",
	"/new(.*)",
	"/select(.*)",
	"/settings(.*)",
	"/campaigns(.*)",
	"/forms(.*)",
	"/assets(.*)",
	"/storage(.*)",
	"/brand(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
	const { userId } = await auth();

	// If user is signed in and trying to access sign-in/sign-up pages, redirect to dashboard
	if (userId && (req.nextUrl.pathname === "/sign-in" || req.nextUrl.pathname === "/sign-up")) {
		return NextResponse.redirect(new URL("/", req.url));
	}

	if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};

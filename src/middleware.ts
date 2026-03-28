import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    // Protect all routes except auth, api/webhooks, and static files
    "/((?!login|register|order|api/webhooks|api/trpc|_next/static|_next/image|favicon.ico).*)",
  ],
};

/**
 * GET /api/health
 * Simple health-check endpoint for uptime monitoring (e.g., UptimeRobot, PM2).
 * Returns 200 when the Next.js server is running.
 */
export async function GET() {
  return new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

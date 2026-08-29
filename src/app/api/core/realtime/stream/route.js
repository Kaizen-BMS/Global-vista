import { getSession } from "@/lib/auth";
import { subscribeToCompany } from "@/lib/realtime/eventBus";

/**
 * Server-Sent Events — a single long-lived HTTP response the server keeps
 * writing to, over plain HTTP/1.1 (no WebSocket upgrade, no extra
 * infrastructure, no cost). Every browser understands this natively via
 * EventSource; see RealtimeUpdatesWatcher.js for the client side.
 *
 * Session-gated the normal way (getSession()), then only ever streams
 * change events for the caller's OWN company — never anything wider.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe;
  let heartbeat;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); }
        catch { /* controller already closed — the abort handler below will clean up */ }
      };

      unsubscribe = subscribeToCompany(session.company_id, send);

      // Keeps intermediary proxies/load balancers from silently timing out
      // an idle connection, and lets the browser's EventSource notice a
      // dead connection and reconnect on its own.
      heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { /* closing */ }
      }, 25000);

      send({ type: "connected" });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disables any reverse-proxy response buffering that would otherwise delay events
    },
  });
}

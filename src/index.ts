import { handleWebhookVerification } from "./webhook-get";
import { handleWebhookPost } from "./webhook-post";
import type { Env } from "./env";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" && request.method === "GET") {
      return Response.json({ ok: true, service: "nomnom-ig-bot" });
    }

    if (path === "/webhook" && request.method === "GET") {
      return handleWebhookVerification(request, env);
    }

    if (path === "/webhook" && request.method === "POST") {
      return handleWebhookPost(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
import http from "node:http";
import { NextRequest } from "next/server";

export function routeServer<P = Record<string, never>>(
  handler: (
    req: NextRequest,
    ctx: { params: Promise<P> }
  ) => Promise<Response> | Response,
  params?: P
): http.Server {
  return http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks);
    const hasBody = !["GET", "HEAD"].includes(req.method ?? "GET") && raw.length > 0;

    const request = new NextRequest(`http://localhost${req.url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: hasBody ? new Uint8Array(raw) : undefined,
    });

    const response = await handler(request, {
      params: Promise.resolve(params as P),
    });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  });
}
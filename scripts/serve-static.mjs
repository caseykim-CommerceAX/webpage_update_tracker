import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const root = resolve(process.cwd(), "out");
const hostname = argument("hostname", "0.0.0.0");
const port = Number.parseInt(argument("port", process.env.PORT ?? "3000"), 10);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function resolveRequest(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  const candidates = [decoded, `${decoded}.html`, `${decoded}/index.html`, "404.html"];
  for (const candidate of candidates) {
    const path = resolve(root, candidate || "index.html");
    if (path !== root && !path.startsWith(`${root}${sep}`)) continue;
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
  const path = resolveRequest(pathname);
  if (!path) {
    response.writeHead(404).end("Not found");
    return;
  }
  const isNotFound = path.endsWith(`${sep}404.html`) && pathname !== "/404.html";
  response.writeHead(isNotFound ? 404 : 200, {
    "content-type": contentTypes[extname(path)] ?? "application/octet-stream",
    "cache-control": extname(path) === ".html" ? "no-cache" : "public, max-age=3600",
  });
  createReadStream(path).pipe(response);
});

server.listen(port, hostname, () => {
  console.log(`Static dashboard: http://${hostname}:${port}`);
});

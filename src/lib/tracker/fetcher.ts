import iconv from "iconv-lite";
import type { Platform } from "@/lib/db-types";
import type { FetchResult } from "@/lib/tracker/types";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 WebpageUpdateTracker/0.1";
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile Safari/537.36 WebpageUpdateTracker/0.1";

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectCharset(contentType: string | null, bytes: Buffer) {
  const headerMatch = contentType?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1];
  if (headerMatch) return headerMatch.toLowerCase();

  const head = bytes.subarray(0, 4096).toString("ascii");
  return (
    head.match(/<meta[^>]+charset\s*=\s*["']?([^"'\s/>]+)/i)?.[1]?.toLowerCase() ??
    "utf-8"
  );
}

function decodeHtml(bytes: Buffer, contentType: string | null) {
  const charset = detectCharset(contentType, bytes).replace("ks_c_5601-1987", "euc-kr");
  return iconv.encodingExists(charset)
    ? iconv.decode(bytes, charset)
    : iconv.decode(bytes, "utf-8");
}

export async function fetchPage(
  url: string,
  platform: Platform,
  options: { timeoutMs?: number; retries?: number } = {},
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? Number(process.env.SCAN_TIMEOUT_MS ?? 15_000);
  const retries = options.retries ?? Number(process.env.SCAN_RETRIES ?? 2);
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "user-agent": platform === "MOBILE" ? MOBILE_UA : DESKTOP_UA,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "accept-language": "ko-KR,ko;q=0.9,en;q=0.7",
        },
      });
      const contentType = response.headers.get("content-type");
      const shouldRetry = TRANSIENT_STATUSES.has(response.status) && attempt < retries;
      if (shouldRetry) {
        await response.arrayBuffer();
        await sleep(400 * 2 ** attempt);
        continue;
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      const isHtml = contentType?.includes("text/html") ?? bytes.subarray(0, 256).toString().includes("<");
      return {
        requestedUrl: url,
        finalUrl: response.url || url,
        status: response.status,
        html: isHtml ? decodeHtml(bytes, contentType) : null,
        contentType,
        responseMs: Date.now() - startedAt,
        error: isHtml || response.status !== 200 ? null : `지원하지 않는 콘텐츠 형식: ${contentType ?? "알 수 없음"}`,
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(400 * 2 ** attempt);
      }
    }
  }

  return {
    requestedUrl: url,
    finalUrl: null,
    status: null,
    html: null,
    contentType: null,
    responseMs: Date.now() - startedAt,
    error: lastError instanceof Error ? lastError.message : "알 수 없는 네트워크 오류",
  };
}

export function isSameDestination(requestedUrl: string, finalUrl: string | null) {
  if (!finalUrl) return false;
  try {
    const requested = new URL(requestedUrl);
    const final = new URL(finalUrl);
    const cleanPath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";
    return requested.hostname.toLowerCase() === final.hostname.toLowerCase() && cleanPath(requested.pathname) === cleanPath(final.pathname);
  } catch {
    return false;
  }
}

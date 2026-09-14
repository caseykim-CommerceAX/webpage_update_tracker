import { createHash } from "node:crypto";
import { diffArrays } from "diff";
import { load } from "cheerio";
import type { CanonicalToken, StructuredDiff, TokenKind } from "@/lib/tracker/types";

const BLOCK_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,dt,dd,th,td,button,label,caption,summary,blockquote";
const TRACKING_PARAMS = new Set(["gclid", "fbclid", "msclkid"]);

export function normalizeText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: string, baseUrl: string) {
  try {
    const url = new URL(value, baseUrl);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return normalizeText(value);
  }
}

function token(kind: TokenKind, key: string, value: string): CanonicalToken | null {
  const normalized = normalizeText(value);
  return normalized ? { kind, key, value: normalized } : null;
}

export function canonicalizeHtml(html: string, baseUrl: string) {
  const $ = load(html);
  $("script,style,noscript,template,svg").remove();
  const tokens: CanonicalToken[] = [];

  const title = token("title", "title", $("title").first().text());
  if (title) tokens.push(title);

  const metas = $("meta[name],meta[property]")
    .map((_, element) => {
      const item = $(element);
      const key = item.attr("property") ?? item.attr("name") ?? "meta";
      return token("meta", key.toLowerCase(), item.attr("content") ?? "");
    })
    .get()
    .filter((item): item is CanonicalToken => Boolean(item))
    .sort((a, b) => `${a.key}:${a.value}`.localeCompare(`${b.key}:${b.value}`));
  tokens.push(...metas);

  $(BLOCK_SELECTOR).each((_, element) => {
    const item = $(element);
    if (item.find(BLOCK_SELECTOR).length > 0) return;
    const kind: TokenKind = /^h[1-6]$/i.test(element.tagName) ? "heading" : "text";
    const value = token(kind, element.tagName.toLowerCase(), item.text());
    if (value) tokens.push(value);
  });

  $("a[href]").each((_, element) => {
    const item = $(element);
    const href = normalizeUrl(item.attr("href") ?? "", baseUrl);
    const value = token("link", normalizeText(item.text()) || "링크", href);
    if (value) tokens.push(value);
  });

  $("img[src]").each((_, element) => {
    const item = $(element);
    const src = normalizeUrl(item.attr("src") ?? "", baseUrl);
    const value = token("image", normalizeText(item.attr("alt") ?? "") || "이미지", src);
    if (value) tokens.push(value);
  });

  const serialized = JSON.stringify(tokens);
  return {
    tokens,
    serialized,
    hash: createHash("sha256").update(serialized).digest("hex"),
  };
}

export function createStructuredDiff(before: CanonicalToken[], after: CanonicalToken[]): StructuredDiff {
  const encode = (item: CanonicalToken) => JSON.stringify(item);
  const decode = (item: string) => JSON.parse(item) as CanonicalToken;
  const changes = diffArrays(before.map(encode), after.map(encode));
  const result: StructuredDiff = { added: [], removed: [] };

  for (const change of changes) {
    if (change.added) result.added.push(...change.value.map(decode));
    if (change.removed) result.removed.push(...change.value.map(decode));
  }
  return result;
}

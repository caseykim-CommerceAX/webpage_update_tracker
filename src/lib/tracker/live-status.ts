import { load } from "cheerio";
import type { LiveStatus } from "@/lib/db-types";
import { normalizeText } from "@/lib/tracker/canonicalize";

export const LIVE_HEAD_SELECTOR = 'head meta[property="og:site_name"]';
export const LIVE_BODY_PHRASE = "이런 분께 추천 드려요";

function withoutWhitespace(value: string) {
  return normalizeText(value).replace(/\s/g, "");
}

export type LiveMarkerResult = {
  headLiveMarkerFound: boolean;
  bodyLiveMarkerFound: boolean;
  headLiveMarkerHtml: string | null;
  bodyLiveMarkerHtml: string | null;
  liveStatus: Exclude<LiveStatus, "UNVERIFIED">;
};

type LocatedElement = {
  sourceCodeLocation?: { startOffset: number; endOffset: number } | null;
};

function getOriginalElementHtml(html: string, element: LocatedElement) {
  const location = element.sourceCodeLocation;
  if (location && Number.isInteger(location.startOffset) && Number.isInteger(location.endOffset)) {
    return html.slice(location.startOffset, location.endOffset);
  }
  return null;
}

export function detectLiveMarkers(html: string): LiveMarkerResult {
  const $ = load(html, { sourceCodeLocationInfo: true });
  const headElement = $(LIVE_HEAD_SELECTOR).first().get(0);
  const headLiveMarkerFound = Boolean(headElement);
  const headLiveMarkerHtml = headElement ? getOriginalElementHtml(html, headElement) : null;
  const expectedBodyPhrase = withoutWhitespace(LIVE_BODY_PHRASE);
  const bodyElement = $("body h2")
    .toArray()
    .find((element) => withoutWhitespace($(element).text()).includes(expectedBodyPhrase));
  const bodyLiveMarkerFound = Boolean(bodyElement);
  const bodyLiveMarkerHtml = bodyElement ? getOriginalElementHtml(html, bodyElement) : null;

  const liveStatus = headLiveMarkerFound && bodyLiveMarkerFound
    ? "LIVE_COMPLETE"
    : headLiveMarkerFound || bodyLiveMarkerFound
      ? "CHECK_REQUIRED"
      : "BEFORE_LIVE";

  return {
    headLiveMarkerFound,
    bodyLiveMarkerFound,
    headLiveMarkerHtml,
    bodyLiveMarkerHtml,
    liveStatus,
  };
}

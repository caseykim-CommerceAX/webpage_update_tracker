export type TokenKind = "title" | "meta" | "heading" | "text" | "link" | "image";

export type DocumentSection = "HEAD" | "BODY";

export type CanonicalToken = {
  kind: TokenKind;
  key: string;
  value: string;
};

export type StructuredDiff = {
  added: CanonicalToken[];
  removed: CanonicalToken[];
};

export type SectionChangeCount = {
  added: number;
  removed: number;
};

export type StructuredDiffSummary = Record<DocumentSection, SectionChangeCount>;

export type FetchResult = {
  requestedUrl: string;
  finalUrl: string | null;
  status: number | null;
  html: string | null;
  contentType: string | null;
  responseMs: number;
  error: string | null;
};

export type EndpointScanOutcome = {
  changed: boolean;
  failed: boolean;
  pending: boolean;
};

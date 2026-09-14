import { load } from "cheerio";
import { z } from "zod";
import { createId, db, nowIso } from "@/lib/db";
import type { Platform } from "@/lib/db-types";

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "HTTPS URL만 사용할 수 있습니다.");
const optionalUrl = z.union([httpsUrl, z.literal(""), z.null()]).optional();

const endpointSchema = z.object({
  platform: z.enum(["DESKTOP", "MOBILE"]),
  url: httpsUrl,
  referenceUrl: optionalUrl,
  lifecycle: z.enum(["EXISTING", "PRELAUNCH"]),
});

const ruleSchema = z.object({
  type: z.enum(["HTTP_STATUS", "META_ATTRIBUTE", "TEXT_CONTAINS"]),
  label: z.string().trim().min(1).max(80),
  selector: z.string().trim().max(300).nullable().optional(),
  attribute: z.string().trim().max(80).nullable().optional(),
  expectedValue: z.string().trim().max(500).nullable().optional(),
  expectedStatuses: z.array(z.number().int().min(100).max(599)).optional(),
  enabled: z.boolean().default(true),
});

export const targetInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  monitorMode: z.enum(["CONTENT", "STATUS_ONLY"]),
  enabled: z.boolean(),
  endpoints: z.array(endpointSchema).min(1).max(2).refine(
    (items) => new Set(items.map((item) => item.platform)).size === items.length,
    "PC와 모바일 URL은 각각 하나만 등록할 수 있습니다.",
  ),
  rules: z.array(ruleSchema).min(1).max(12),
});

export type TargetInput = z.infer<typeof targetInputSchema>;

function validateSelectors(input: TargetInput) {
  const $ = load("<html><head></head><body></body></html>");
  for (const rule of input.rules) {
    if (rule.type === "HTTP_STATUS") continue;
    if (!rule.selector) throw new Error(`${rule.label}: CSS 선택자가 필요합니다.`);
    try {
      $(rule.selector);
    } catch {
      throw new Error(`${rule.label}: 올바르지 않은 CSS 선택자입니다.`);
    }
  }
}

function insertRules(targetId: string, rules: TargetInput["rules"], timestamp: string) {
  const statement = db.prepare(
    `INSERT INTO Rule
     (id, targetId, type, label, selector, attribute, expectedValue, expectedStatuses, enabled, displayOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  rules.forEach((rule, index) => statement.run(
    createId(), targetId, rule.type, rule.label, rule.selector ?? null, rule.attribute ?? null,
    rule.expectedValue ?? null,
    rule.type === "HTTP_STATUS" ? JSON.stringify(rule.expectedStatuses?.length ? rule.expectedStatuses : [200]) : null,
    rule.enabled ? 1 : 0, index, timestamp, timestamp,
  ));
}

export function createTarget(input: TargetInput) {
  validateSelectors(input);
  const create = db.transaction(() => {
    const order = db.prepare("SELECT COALESCE(MAX(displayOrder), 0) + 1 AS nextOrder FROM Target").get() as { nextOrder: number };
    const id = createId();
    const timestamp = nowIso();
    db.prepare(
      "INSERT INTO Target (id, displayOrder, name, category, monitorMode, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(id, order.nextOrder, input.name, input.category, input.monitorMode, input.enabled ? 1 : 0, timestamp, timestamp);
    const insertEndpoint = db.prepare(
      "INSERT INTO Endpoint (id, targetId, platform, url, referenceUrl, lifecycle, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
    );
    for (const endpoint of input.endpoints) {
      insertEndpoint.run(createId(), id, endpoint.platform, endpoint.url, endpoint.referenceUrl || null, endpoint.lifecycle, timestamp, timestamp);
    }
    insertRules(id, input.rules, timestamp);
    return id;
  });
  return create();
}

export function updateTarget(targetId: string, input: TargetInput) {
  validateSelectors(input);
  const update = db.transaction(() => {
    const current = db.prepare("SELECT id FROM Target WHERE id = ?").get(targetId);
    if (!current) throw new Error("대상을 찾을 수 없습니다.");
    const timestamp = nowIso();
    db.prepare("UPDATE Target SET name = ?, category = ?, monitorMode = ?, enabled = ?, updatedAt = ? WHERE id = ?").run(
      input.name, input.category, input.monitorMode, input.enabled ? 1 : 0, timestamp, targetId,
    );

    const existing = db.prepare(
      "SELECT id, platform, url FROM Endpoint WHERE targetId = ? AND retiredAt IS NULL",
    ).all(targetId) as Array<{ id: string; platform: Platform; url: string }>;
    const incoming = new Map(input.endpoints.map((endpoint) => [endpoint.platform, endpoint]));
    for (const endpoint of existing) {
      const next = incoming.get(endpoint.platform);
      if (!next || next.url !== endpoint.url) {
        db.prepare("UPDATE Endpoint SET enabled = 0, retiredAt = ?, updatedAt = ? WHERE id = ?").run(timestamp, timestamp, endpoint.id);
      } else {
        db.prepare("UPDATE Endpoint SET referenceUrl = ?, lifecycle = ?, updatedAt = ? WHERE id = ?").run(
          next.referenceUrl || null, next.lifecycle, timestamp, endpoint.id,
        );
        incoming.delete(endpoint.platform);
      }
    }
    const insertEndpoint = db.prepare(
      "INSERT INTO Endpoint (id, targetId, platform, url, referenceUrl, lifecycle, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
    );
    for (const endpoint of incoming.values()) {
      insertEndpoint.run(createId(), targetId, endpoint.platform, endpoint.url, endpoint.referenceUrl || null, endpoint.lifecycle, timestamp, timestamp);
    }

    db.prepare("DELETE FROM Rule WHERE targetId = ?").run(targetId);
    insertRules(targetId, input.rules, timestamp);
  });
  update();
}

import "dotenv/config";
import { closeDb, createId, db, nowIso } from "../src/lib/db";
import type { Lifecycle, MonitorMode, Platform, RuleType } from "../src/lib/db-types";

type SeedTarget = {
  name: string;
  category: string;
  desktop: string;
  mobile?: string;
  referenceDesktop?: string;
  referenceMobile?: string;
  lifecycle?: Lifecycle;
  monitorMode?: MonitorMode;
  rules?: "CARD" | "META" | "STATUS";
};

const productTargets: Array<[string, string, string]> = [
  ["ALL 카드", "신용카드", "credit-cards/kb-all-card"],
  ["ALL point 카드", "신용카드", "credit-cards/kb-all-point-card"],
  ["YOU Prime 카드", "신용카드", "credit-cards/kb-you-prime-card"],
  ["YOU With 카드", "신용카드", "credit-cards/kb-you-with-card"],
  ["YOU Wish 카드", "신용카드", "credit-cards/kb-you-wish-card"],
  ["YOU Wish up 카드", "신용카드", "credit-cards/kb-you-wish-up-card"],
  ["NEED Edu카드", "신용카드", "credit-cards/kb-need-edu-card"],
  ["NEED Global 카드", "신용카드", "credit-cards/kb-need-global-card"],
  ["NEED Pay 카드", "신용카드", "credit-cards/kb-need-pay-card"],
  ["WE:SH Travel", "신용카드", "credit-cards/kb-wesh-travel-card"],
  ["My WE:SH 카드", "신용카드", "credit-cards/kb-my-wesh-card"],
  ["굿데이올림카드", "신용카드", "credit-cards/kb-good-day-ollim-card"],
  ["스카이패스 티타늄카드", "신용카드", "credit-cards/kb-skypass-titanium-card"],
  ["American Express Blue Card", "신용카드", "credit-cards/american-express-blue-kb-kookmin-card"],
  ["HERITAGE Classic(할인형)", "프리미엄카드", "premium-cards/kb-heritage-classic-discount-type"],
  ["HERITAGE Classic(스카이패스형)", "프리미엄카드", "premium-cards/kb-heritage-classic-skypass-type"],
  ["Youth Club 체크카드", "체크카드", "check-cards/kb-youth-club-check-card"],
  ["노리2 체크카드(KB Pay)", "체크카드", "check-cards/kb-nori2-check-card-kbpay-type"],
  ["트래블러스 체크카드", "체크카드", "check-cards/kb-travelers-check-card"],
  ["국민행복카드", "신용카드", "credit-cards/kb-kookmin-haengbok-card"],
];

const targets: SeedTarget[] = productTargets.map(([name, category, path]) => ({
  name,
  category,
  desktop: `https://card.kbcard.com/cards/products/${path}`,
  mobile: `https://m.kbcard.com/cards/${path}`,
}));

targets.splice(16, 0, {
  name: "BeV Ⅲ 카드",
  category: "프리미엄카드",
  desktop: "https://card.kbcard.com/cards/products/premium-cards/kb-bev3-card",
  mobile: "https://m.kbcard.com/cards/premium-cards/kb-bev3-card",
  referenceDesktop: "https://card.kbcard.com/cards/products/premium-cards/bev3-card",
  referenceMobile: "https://m.kbcard.com/cards/premium-cards/bev3-card",
  lifecycle: "PRELAUNCH",
});

targets.push(
  {
    name: "서비스",
    category: "서비스",
    desktop: "https://card.kbcard.com/benefits/vip-lounge/kb-prime-plus",
    referenceDesktop: "https://card.kbcard.com/benefits/vip-lounge/prime-plus",
    lifecycle: "PRELAUNCH",
    rules: "META",
  },
  {
    name: "이벤트",
    category: "이벤트",
    desktop: "https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-09",
    mobile: "https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-09",
    lifecycle: "PRELAUNCH",
    monitorMode: "STATUS_ONLY",
    rules: "STATUS",
  },
);

function rulesFor(preset: SeedTarget["rules"] = "CARD") {
  const rules: Array<{
    type: RuleType;
    label: string;
    selector?: string;
    attribute?: string;
    expectedValue?: string;
    expectedStatuses?: string;
    displayOrder: number;
  }> = [{ type: "HTTP_STATUS", label: "HTTP 200", expectedStatuses: "[200]", displayOrder: 0 }];
  if (preset !== "STATUS") {
    rules.push({
      type: "META_ATTRIBUTE",
      label: "KB국민카드 OG 태그",
      selector: 'meta[property="og:site_name"]',
      attribute: "content",
      expectedValue: "KB국민카드",
      displayOrder: 1,
    });
  }
  if (preset === "CARD") {
    rules.push({
      type: "TEXT_CONTAINS",
      label: "추천 문구",
      selector: "h2",
      expectedValue: "이런 분께 추천드려요",
      displayOrder: 2,
    });
  }
  return rules;
}

function main() {
  const seed = db.transaction(() => {
    for (const [index, item] of targets.entries()) {
      const displayOrder = index + 1;
      const exists = db.prepare("SELECT id FROM Target WHERE displayOrder = ?").get(displayOrder);
      if (exists) continue;
      const targetId = createId();
      const timestamp = nowIso();
      db.prepare(
        "INSERT INTO Target (id, displayOrder, name, category, monitorMode, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
      ).run(targetId, displayOrder, item.name, item.category, item.monitorMode ?? "CONTENT", timestamp, timestamp);

      const insertEndpoint = db.prepare(
        "INSERT INTO Endpoint (id, targetId, platform, url, referenceUrl, lifecycle, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
      );
      const endpoints: Array<[Platform, string, string | undefined]> = [["DESKTOP", item.desktop, item.referenceDesktop]];
      if (item.mobile) endpoints.push(["MOBILE", item.mobile, item.referenceMobile]);
      for (const [platform, url, referenceUrl] of endpoints) {
        insertEndpoint.run(createId(), targetId, platform, url, referenceUrl ?? null, item.lifecycle ?? "EXISTING", timestamp, timestamp);
      }

      const insertRule = db.prepare(
        "INSERT INTO Rule (id, targetId, type, label, selector, attribute, expectedValue, expectedStatuses, enabled, displayOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
      );
      for (const rule of rulesFor(item.rules)) {
        insertRule.run(
          createId(), targetId, rule.type, rule.label, rule.selector ?? null, rule.attribute ?? null,
          rule.expectedValue ?? null, rule.expectedStatuses ?? null, rule.displayOrder, timestamp, timestamp,
        );
      }
    }
  });
  seed();
  const count = db.prepare("SELECT COUNT(*) AS count FROM Target").get() as { count: number };
  console.log(`초기 데이터 확인 완료: ${count.count}개 항목`);
}

try {
  main();
} finally {
  closeDb();
}

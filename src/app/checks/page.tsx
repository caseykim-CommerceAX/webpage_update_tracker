import type { Metadata } from "next";
import { CheckHistory } from "@/components/check-history";
import { getCheckHistoryByEndpoint, getCheckHistoryTargets } from "@/lib/queries";

export const metadata: Metadata = {
  title: "URL별 진단 로그",
};

export default function ChecksPage() {
  const history = getCheckHistoryByEndpoint({ pageSize: 500 });
  return <CheckHistory groups={history.groups} targets={getCheckHistoryTargets()} />;
}

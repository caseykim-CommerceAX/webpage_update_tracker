import type { AvailabilityStatus } from "@/lib/db-types";
import type { RuleResultView } from "@/lib/queries";

export type DiagnosticCheck = {
  availabilityStatus: AvailabilityStatus;
  httpStatus: number | null;
  errorMessage: string | null;
  finalUrl?: string | null;
  requestedUrl?: string | null;
  failureDetails: RuleResultView[];
};

export type DiagnosticItem = {
  title: string;
  reason: string;
  actualValue?: string | null;
};

export function hasCheckIssue(check: Pick<DiagnosticCheck, "availabilityStatus" | "failureDetails">) {
  return check.availabilityStatus === "ERROR"
    || check.availabilityStatus === "UNAVAILABLE"
    || check.failureDetails.length > 0;
}

export function getCheckDiagnostics(check: DiagnosticCheck): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];

  if (check.availabilityStatus === "ERROR") {
    diagnostics.push({
      title: "응답 수집 실패",
      reason: check.errorMessage ?? "페이지 응답을 받지 못했습니다. 네트워크와 URL을 확인하세요.",
    });
  } else if (check.availabilityStatus === "UNAVAILABLE") {
    diagnostics.push({
      title: "페이지 접속 실패",
      reason: check.errorMessage ?? (check.httpStatus === null
        ? "정상 응답을 확인하지 못했습니다. URL과 페이지 상태를 확인하세요."
        : `HTTP ${check.httpStatus} 응답입니다. 페이지 상태를 확인하세요.`),
    });
  }

  for (const failure of check.failureDetails) {
    diagnostics.push({
      title: failure.ruleLabel,
      reason: failure.message ?? (failure.status === "ERROR" ? "규칙 검사 중 오류가 발생했습니다." : "등록된 기대 조건과 일치하지 않습니다."),
      actualValue: failure.actualValue,
    });
  }

  return diagnostics;
}

export function CheckDiagnostics({ check, compact = false }: { check: DiagnosticCheck; compact?: boolean }) {
  const diagnostics = getCheckDiagnostics(check);
  if (diagnostics.length === 0) return null;

  return (
    <div className={`diagnostic-strip ${compact ? "text-xs" : "text-sm"}`}>
      <p className="font-black text-[#e4002b]">확인할 내용 {diagnostics.length}건</p>
      <ul className="mt-2 space-y-2">
        {diagnostics.map((item, index) => (
          <li key={`${item.title}-${index}`} className="min-w-0">
            <p className="font-extrabold text-neutral-950">{item.title}</p>
            <p className="mt-0.5 break-words leading-5 text-neutral-600">{item.reason}</p>
            {item.actualValue ? (
              <p className="mt-1 break-all border-l border-neutral-300 pl-2 text-neutral-500">
                실제 확인값: {item.actualValue}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

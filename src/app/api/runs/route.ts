import { NextResponse } from "next/server";
import { z } from "zod";
import { getRecentRuns } from "@/lib/queries";
import { dispatchLocalRun } from "@/lib/tracker/dispatcher";
import { createQueuedRun, RunAlreadyActiveError } from "@/lib/tracker/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({ targetIds: z.array(z.string().min(1)).max(100).optional() });

export function GET() {
  return NextResponse.json(getRecentRuns());
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const run = createQueuedRun("MANUAL", body.targetIds);
    dispatchLocalRun(run.id);
    return NextResponse.json({ runId: run.id, status: run.status }, { status: 202 });
  } catch (error) {
    if (error instanceof RunAlreadyActiveError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "검사 시작 오류" }, { status: 400 });
  }
}

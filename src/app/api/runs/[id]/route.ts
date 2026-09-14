import { NextResponse } from "next/server";
import { getRunProgress } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = getRunProgress(id);
  return run
    ? NextResponse.json(run)
    : NextResponse.json({ error: "실행을 찾을 수 없습니다." }, { status: 404 });
}

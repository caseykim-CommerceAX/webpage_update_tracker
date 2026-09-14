import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getTargets } from "@/lib/queries";
import { createTarget, targetInputSchema } from "@/lib/target-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getTargets());
}

export async function POST(request: Request) {
  try {
    const input = targetInputSchema.parse(await request.json());
    const id = createTarget(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "저장 오류";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

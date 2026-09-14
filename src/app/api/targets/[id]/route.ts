import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { targetInputSchema, updateTarget } from "@/lib/target-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, body] = await Promise.all([params, request.json()]);
    updateTarget(id, targetInputSchema.parse(body));
    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "저장 오류";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

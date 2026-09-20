import { NextResponse } from "next/server";
import { runStore } from "@/lib/run-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await runStore.get(id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json(run);
}

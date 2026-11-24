import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export async function audit(action: string, opts: { actorId?: string | null; tenantId?: string | null; meta?: Prisma.InputJsonValue } = {}) {
  try {
    await db.auditLog.create({ data: { action, actorId: opts.actorId ?? null, tenantId: opts.tenantId ?? null, meta: opts.meta } });
  } catch (e) {
    console.error("audit log falhou", e);
  }
}

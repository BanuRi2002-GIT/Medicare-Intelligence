import type { Request } from "express";
import { prisma } from "../../lib/prisma";

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "DOWNLOAD"
  | "ACCESS_DENIED";

interface AuditLogInput {
  userId?: number | null;
  action: AuditAction;
  entity: string;
  entityId?: string | number;
  description?: string;
  req?: Request;
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId:
          input.entityId !== undefined
            ? String(input.entityId)
            : undefined,
        description: input.description,
        ipAddress: input.req?.ip,
        userAgent: input.req?.get("user-agent")?.slice(0, 500),
      },
    });
  } catch (error) {
    console.error("AUDIT LOG ERROR:", error);

    // Do not silently ignore audit failures for sensitive operations
    throw new Error("Unable to record audit event");
  }
}
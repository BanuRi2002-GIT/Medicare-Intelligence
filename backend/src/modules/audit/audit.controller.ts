import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

export async function getAuditLogs(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const action =
      typeof req.query.action === "string"
        ? req.query.action
        : undefined;

    const allowedActions = [
      "LOGIN",
      "LOGOUT",
      "CREATE",
      "READ",
      "UPDATE",
      "DELETE",
      "DOWNLOAD",
      "ACCESS_DENIED",
    ];

    if (action && !allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit action",
      });
    }

    const where = action
      ? { action: action as
          | "LOGIN"
          | "LOGOUT"
          | "CREATE"
          | "READ"
          | "UPDATE"
          | "DELETE"
          | "DOWNLOAD"
          | "ACCESS_DENIED" }
      : {};

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.auditLog.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET AUDIT LOGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve audit logs",
    });
  }
}
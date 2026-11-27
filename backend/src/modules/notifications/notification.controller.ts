import type { Response } from "express";
import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";

export async function getMyNotifications(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications",
    });
  }
}

export async function markNotificationAsRead(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: req.user.id,
      },
      data: {
        isRead: true,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("MARK NOTIFICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification",
    });
  }
}
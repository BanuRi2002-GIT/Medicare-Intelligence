import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import {
  getMyNotifications,
  markNotificationAsRead,
} from "./notification.controller";

const router = Router();

router.use(authenticate);

router.get("/my", getMyNotifications);

router.patch("/:id/read", markNotificationAsRead);

export default router;
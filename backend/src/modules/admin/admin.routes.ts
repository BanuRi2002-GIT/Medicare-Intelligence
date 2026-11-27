
import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";
import { getAdminDashboard } from "./admin.controller";

const router = Router();

// ==========================================
// ADMIN DASHBOARD ROUTE
// Only authenticated ADMIN users can access.
// ==========================================

router.get(
  "/dashboard",
  authenticate,
  authorize("ADMIN"),
  getAdminDashboard
);

export default router;

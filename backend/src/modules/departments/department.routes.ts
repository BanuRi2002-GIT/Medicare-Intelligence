
import { Router } from "express";

import {
  getDepartments,
  createDepartment,
} from "./department.controller";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

// Authenticated users can view departments.
router.get("/", authenticate, getDepartments);

// Only administrators can create departments.
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  createDepartment
);

export default router;

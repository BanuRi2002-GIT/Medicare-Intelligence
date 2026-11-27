
import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import {
  getDepartments,
  createDepartment,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "./department.controller";

const router = Router();

// ==========================================
// AUTHENTICATION
// All department routes require login.
// ==========================================

router.use(authenticate);

// ==========================================
// 1. GET ALL DEPARTMENTS
// Authenticated users
// ==========================================

router.get("/", getDepartments);

// ==========================================
// 2. GET DEPARTMENT BY ID
// Authenticated users
// ==========================================

router.get("/:id", getDepartmentById);

// ==========================================
// 3. CREATE DEPARTMENT
// ADMIN ONLY
// ==========================================

router.post(
  "/",
  authorize("ADMIN"),
  createDepartment
);

// ==========================================
// 4. UPDATE DEPARTMENT
// ADMIN ONLY
// ==========================================

router.patch(
  "/:id",
  authorize("ADMIN"),
  updateDepartment
);

// ==========================================
// 5. DELETE DEPARTMENT
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authorize("ADMIN"),
  deleteDepartment
);

export default router;

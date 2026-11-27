
import { Router } from "express";
import {
  getDoctors,
  getDoctorById,
} from "./doctor.controller";

import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// All authenticated users can view doctor information.
router.get("/", authenticate, getDoctors);

router.get("/:id", authenticate, getDoctorById);

export default router;

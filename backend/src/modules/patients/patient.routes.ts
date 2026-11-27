
import { Router } from "express";

import {
  getMyPatientProfile,
  updateMyPatientProfile,
  getMyMedicalHistory,
} from "./patient.controller";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

// All routes require authentication and PATIENT role.
router.use(authenticate, authorize("PATIENT"));

router.get("/me", getMyPatientProfile);

router.patch("/me", updateMyPatientProfile);

router.get("/me/medical-history", getMyMedicalHistory);

router.patch("/me", updateMyPatientProfile);

router.use(authenticate);
router.use(authorize("PATIENT"));

export default router;

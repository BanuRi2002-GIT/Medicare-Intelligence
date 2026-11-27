
import { Router } from "express";

import {
  createMedicalRecord,
  getMyMedicalRecords,
  getMyCreatedRecords,
} from "./medical-record.controller";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

// Doctors create clinical records.
router.post(
  "/",
  authorize("DOCTOR"),
  createMedicalRecord
);

// Patients view their own records.
router.get(
  "/my",
  authorize("PATIENT"),
  getMyMedicalRecords
);

// Doctors view records they created.
router.get(
  "/doctor/my",
  authorize("DOCTOR"),
  getMyCreatedRecords
);

export default router;

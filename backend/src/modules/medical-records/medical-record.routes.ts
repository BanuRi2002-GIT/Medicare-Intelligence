
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

import {
  getPatientConsultationHistory,
} from "./consultation-history.controller";

import {
  getConsultationDetails,
} from "./consultation-details.controller";

import {
  getMyMedicalTimeline,
} from "../patients/patient-timeline.controller";

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

router.get(
  "/patient/:patientId/consultations",
  authorize("DOCTOR"),
  getPatientConsultationHistory
);

router.get(
  "/consultation/:recordId/details",
  authorize("DOCTOR"),
  getConsultationDetails
);

router.get(
  "/my/timeline",
  authorize("PATIENT"),
  getMyMedicalTimeline
);

export default router;

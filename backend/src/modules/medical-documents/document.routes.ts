import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import {
  uploadMedicalDocument,
  getMyMedicalDocuments,
  downloadMedicalDocument,
} from "./document.controller";

import { medicalDocumentUpload } from "./document.upload";

const router = Router();

router.use(authenticate);

router.post(
  "/upload",
  authorize("PATIENT"),
  medicalDocumentUpload.single("document"),
  uploadMedicalDocument
);

router.get(
  "/my",
  authorize("PATIENT"),
  getMyMedicalDocuments
);

router.get(
  "/:id/download",
  authorize("PATIENT", "DOCTOR"),
  downloadMedicalDocument
);

export default router;
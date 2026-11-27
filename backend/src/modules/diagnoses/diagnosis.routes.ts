import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";

import {
  createDiagnosis,
  getDiagnosesByRecord,
} from "./diagnosis.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("DOCTOR"));

router.post("/", createDiagnosis);
router.get("/record/:recordId", getDiagnosesByRecord);

export default router;
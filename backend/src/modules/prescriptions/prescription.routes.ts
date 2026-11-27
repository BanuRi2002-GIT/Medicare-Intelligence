import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";

import {
  createPrescription,
  getMyPrescriptions,
} from "./prescription.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("DOCTOR"));

router.post("/", createPrescription);
router.get("/my", getMyPrescriptions);

export default router;
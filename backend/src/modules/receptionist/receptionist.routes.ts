
import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import {
  registerPatientByReceptionist,
  searchPatientsByReceptionist,
} from "./receptionist.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("RECEPTIONIST"));

router.post("/patients", registerPatientByReceptionist);
router.get("/patients", searchPatientsByReceptionist);

export default router;

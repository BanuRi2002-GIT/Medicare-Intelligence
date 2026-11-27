
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import {
  getMyHealthHistory,
  addMyAllergy,
  deleteMyAllergy,
  addMyCondition,
  deleteMyCondition,
} from "./patient-health.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("PATIENT"));

router.get("/my", getMyHealthHistory);

router.post("/my/allergies", addMyAllergy);
router.delete("/my/allergies/:id", deleteMyAllergy);

router.post("/my/conditions", addMyCondition);
router.delete("/my/conditions/:id", deleteMyCondition);

export default router;

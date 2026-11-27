
import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";
import { getReceptionistDashboard } from "./receptionist-dashboard.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("RECEPTIONIST"));

router.get("/", getReceptionistDashboard);

export default router;

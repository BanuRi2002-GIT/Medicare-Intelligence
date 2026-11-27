import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import {
  getMySchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "./schedule.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("DOCTOR"));

router.get("/my", getMySchedules);
router.post("/", createSchedule);
router.patch("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);

export default router;
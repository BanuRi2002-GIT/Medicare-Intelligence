import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import {
  getMyLeaves,
  createLeave,
  deleteLeave,
} from "./leave.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("DOCTOR"));

router.get("/my", getMyLeaves);
router.post("/", createLeave);
router.delete("/:id", deleteLeave);

export default router;
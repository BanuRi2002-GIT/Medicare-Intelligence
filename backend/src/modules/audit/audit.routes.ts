import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { getAuditLogs } from "./audit.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", getAuditLogs);

export default router;
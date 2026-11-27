import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { getAvailableSlots } from "./availability.controller";

const router = Router();

router.get(
  "/doctors/:doctorId/slots",
  authenticate,
  authorize("PATIENT"),
  getAvailableSlots
);

export default router;
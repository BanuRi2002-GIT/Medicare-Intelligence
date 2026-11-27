
import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import {
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  rescheduleAppointment,
  confirmAppointment,
} from "./appointment.controller";

// TEMPORARY DEBUGGING CODE
console.log("Appointment handlers:", {
  createAppointment: typeof createAppointment,
  getMyAppointments: typeof getMyAppointments,
  cancelAppointment: typeof cancelAppointment,
  rescheduleAppointment: typeof rescheduleAppointment,
  confirmAppointment: typeof confirmAppointment,
  authenticate: typeof authenticate,
  authorize: typeof authorize,
});

console.log("Doctor authorization middleware:", typeof authorize("DOCTOR"));

const router = Router();

router.use(authenticate);

// PATIENT ROUTES

router.post("/", authorize("PATIENT"), createAppointment);

router.get("/my", authorize("PATIENT"), getMyAppointments);

router.patch("/:id/cancel", authorize("PATIENT"), cancelAppointment);

router.patch("/:id/reschedule", authorize("PATIENT"), rescheduleAppointment);

// DOCTOR ROUTES

router.patch("/:id/confirm", authorize("DOCTOR"), confirmAppointment);

export default router;

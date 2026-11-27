
import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import {
  bookAppointmentForPatient,
} from "./receptionist-appointment.controller";

import {
  getReceptionistAppointments,
  cancelReceptionistAppointment,
} from "./receptionist-appointment-management.controller";

import { rescheduleReceptionistAppointment } from "./receptionist-reschedule.controller";

const router = Router();

// ==========================================
// RECEPTIONIST AUTHENTICATION & AUTHORIZATION
// ==========================================

// All routes require authentication
router.use(authenticate);

// Only users with the RECEPTIONIST role can access these routes
router.use(authorize("RECEPTIONIST"));

// ==========================================
// 1. BOOK APPOINTMENT FOR A PATIENT
// ==========================================

router.post("/", bookAppointmentForPatient);

// ==========================================
// 2. VIEW AND SEARCH CLINIC APPOINTMENTS
// ==========================================

router.get("/", getReceptionistAppointments);

// ==========================================
// 3. CANCEL AN APPOINTMENT
// ==========================================

router.patch("/:id/cancel", cancelReceptionistAppointment);

router.patch("/:id/reschedule", rescheduleReceptionistAppointment);

export default router;

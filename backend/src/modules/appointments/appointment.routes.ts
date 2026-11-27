
// import { Router } from "express";
// import { rejectAppointment } from "./appointment.controller";

// import {
//   authenticate,
//   authorize,
// } from "../../middlewares/auth.middleware";

// import {
//   createAppointment,
//   getMyAppointments,
//   cancelAppointment,
//   rescheduleAppointment,
//   confirmAppointment,
// } from "./appointment.controller";

// // TEMPORARY DEBUGGING CODE
// console.log("Appointment handlers:", {
//   createAppointment: typeof createAppointment,
//   getMyAppointments: typeof getMyAppointments,
//   cancelAppointment: typeof cancelAppointment,
//   rescheduleAppointment: typeof rescheduleAppointment,
//   confirmAppointment: typeof confirmAppointment,
//   authenticate: typeof authenticate,
//   authorize: typeof authorize,
// });

// console.log("Doctor authorization middleware:", typeof authorize("DOCTOR"));

// const router = Router();

// router.use(authenticate);

// // PATIENT ROUTES

// router.post("/", authorize("PATIENT"), createAppointment);

// router.get("/my", authorize("PATIENT"), getMyAppointments);

// router.patch("/:id/cancel", authorize("PATIENT"), cancelAppointment);

// router.patch("/:id/reschedule", authorize("PATIENT"), rescheduleAppointment);

// // DOCTOR ROUTES

// router.patch("/:id/confirm", authorize("DOCTOR"), confirmAppointment);

// export default router;



import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { getDoctorAppointments } from "./doctor-appointment.controller";
import { completeConsultation } from "./consultation.controller";

import {
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  rescheduleAppointment,
  confirmAppointment,
  rejectAppointment,
} from "./appointment.controller";

const router = Router();

// All appointment routes require authentication
router.use(authenticate);

// ==========================================
// PATIENT-SPECIFIC ROUTES
// ==========================================

// Book appointment
router.post(
  "/",
  authorize("PATIENT"),
  createAppointment
);

router.post(
  "/:id/consultation",
  authorize("DOCTOR"),
  completeConsultation
);

// Get logged-in patient's appointments
router.get(
  "/my",
  authorize("PATIENT"),
  getMyAppointments
);

//
router.get(
  "/doctor/my",
  authorize("DOCTOR"),
  getDoctorAppointments
);

// Cancel appointment
router.patch(
  "/:id/cancel",
  authorize("PATIENT"),
  cancelAppointment
);

// Reschedule appointment
router.patch(
  "/:id/reschedule",
  authorize("PATIENT"),
  rescheduleAppointment
);

// ==========================================
// DOCTOR-SPECIFIC ROUTES
// ==========================================

// Confirm appointment
router.patch(
  "/:id/confirm",
  authorize("DOCTOR"),
  confirmAppointment
);

// Reject appointment
router.patch(
  "/:id/reject",
  authorize("DOCTOR"),
  rejectAppointment
);

export default router;


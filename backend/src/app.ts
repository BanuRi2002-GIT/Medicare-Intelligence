
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";


import { prisma } from "./lib/prisma";
import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from "./modules/admin/admin.routes";
import doctorRoutes from "./modules/doctors/doctor.routes";
import departmentRoutes from "./modules/departments/department.routes";
import patientRoutes from "./modules/patients/patient.routes";
import appointmentRoutes from "./modules/appointments/appointment.routes";
import medicalRecordRoutes from "./modules/medical-records/medical-record.routes";
import diagnosisRoutes from "./modules/diagnoses/diagnosis.routes";
import prescriptionRoutes from "./modules/prescriptions/prescription.routes";
import medicalDocumentRoutes from "./modules/medical-documents/document.routes";
import auditRoutes from "./modules/audit/audit.routes";
import notificationRoutes from "./modules/notifications/notification.routes";

const app = express();

// Security middleware
app.use(helmet());
app.use("/api/admin", adminRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/diagnoses", diagnosisRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/medical-documents", medicalDocumentRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/notifications", notificationRoutes);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Request parsing and logging
app.use(express.json());
app.use(morgan("dev"));

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Welcome to MediCare Intelligence API",
  });
});

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "MediCare Intelligence API is running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "Database connection failed",
      database: "disconnected",
    });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);

app.use(express.json());

export default app;

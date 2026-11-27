import type { Response } from "express";
import fs from "fs/promises";
import path from "path";

import { prisma } from "../../lib/prisma";
import type { AuthenticatedRequest } from "../../middlewares/auth.types";
import { uploadDocumentSchema } from "./document.validation";

const uploadDirectory = path.resolve(
  process.cwd(),
  "private-storage",
  "medical-documents"
);

export async function uploadMedicalDocument(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Please select a document to upload",
      });
    }

    const validation = uploadDocumentSchema.safeParse(req.body);

    if (!validation.success) {
      await fs.unlink(file.path).catch(() => undefined);

      return res.status(400).json({
        success: false,
        message: "Invalid document information",
        errors: validation.error.flatten(),
      });
    }

    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      await fs.unlink(file.path).catch(() => undefined);

      return res.status(403).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const document = await prisma.medicalDocument.create({
      data: {
        patientId: patient.id,
        uploadedByUserId: req.user.id,
        documentType: validation.data.documentType,
        title: validation.data.title,
        originalName: path.basename(file.originalname),
        storedName: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Medical document uploaded successfully",
      data: document,
    });
  } catch (error) {
    console.error("UPLOAD MEDICAL DOCUMENT ERROR:", error);

    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }

    return res.status(500).json({
      success: false,
      message: "Unable to upload medical document",
    });
  }
}

export async function getMyMedicalDocuments(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const documents = await prisma.medicalDocument.findMany({
      where: {
        patientId: patient.id,
      },
      select: {
        id: true,
        documentType: true,
        title: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("GET MEDICAL DOCUMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve medical documents",
    });
  }
}

export async function downloadMedicalDocument(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const documentId = Number(req.params.id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    const document = await prisma.medicalDocument.findUnique({
      where: {
        id: documentId,
      },
      include: {
        patient: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Patients can download only their own documents.
    const isPatientOwner =
      document.patient.userId === req.user.id;

    // Doctors can download documents only when an appointment
    // establishes an existing care relationship.
    let isAssignedDoctor = false;

    if (req.user.roles.includes("DOCTOR")) {
      const doctor = await prisma.doctor.findUnique({
        where: {
          userId: req.user.id,
        },
        select: {
          id: true,
        },
      });

      if (doctor) {
        const appointment = await prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId: document.patientId,
            status: {
              in: ["CONFIRMED", "COMPLETED"],
            },
          },
          select: {
            id: true,
          },
        });

        isAssignedDoctor = Boolean(appointment);
      }
    }

    if (!isPatientOwner && !isAssignedDoctor) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this document",
      });
    }

    const filePath = path.resolve(
      uploadDirectory,
      document.storedName
    );

    // Confirm that the resolved path remains inside private storage.
    if (!filePath.startsWith(uploadDirectory + path.sep)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document location",
      });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: "Stored document could not be found",
      });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.download(
      filePath,
      document.originalName
    );
  } catch (error) {
    console.error("DOWNLOAD MEDICAL DOCUMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to download medical document",
    });
  }
}
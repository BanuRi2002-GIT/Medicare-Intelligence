import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.resolve(
  process.cwd(),
  "private-storage",
  "medical-documents"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, _file, callback) => {
    const uniqueName = `${crypto.randomUUID()}.upload`;
    callback(null, uniqueName);
  },
});

export const medicalDocumentUpload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new Error("Only PDF, JPG and PNG files are allowed")
      );
    }

    callback(null, true);
  },
});
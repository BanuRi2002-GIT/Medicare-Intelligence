/*
  Warnings:

  - Added the required column `doctor_id` to the `medical_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_id` to the `medical_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `medical_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `medical_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `medical_records` ADD COLUMN `clinical_notes` TEXT NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `doctor_id` INTEGER NOT NULL,
    ADD COLUMN `patient_id` INTEGER NOT NULL,
    ADD COLUMN `record_type` ENUM('CONSULTATION', 'DIAGNOSIS', 'LAB_REPORT', 'PRESCRIPTION', 'OTHER') NOT NULL DEFAULT 'CONSULTATION',
    ADD COLUMN `title` VARCHAR(200) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    MODIFY `appointment_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `diagnoses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `medical_record_id` INTEGER NOT NULL,
    `diagnosis_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `diagnosed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `diagnoses_medical_record_id_idx`(`medical_record_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prescriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `medical_record_id` INTEGER NOT NULL,
    `doctor_id` INTEGER NOT NULL,
    `patient_id` INTEGER NOT NULL,
    `instructions` TEXT NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prescriptions_patient_id_issued_at_idx`(`patient_id`, `issued_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prescription_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prescription_id` INTEGER NOT NULL,
    `medication_name` VARCHAR(200) NOT NULL,
    `dosage` VARCHAR(100) NOT NULL,
    `frequency` VARCHAR(100) NOT NULL,
    `duration` VARCHAR(100) NOT NULL,
    `instructions` TEXT NULL,

    INDEX `prescription_items_prescription_id_idx`(`prescription_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `medical_records_patient_id_created_at_idx` ON `medical_records`(`patient_id`, `created_at`);

-- CreateIndex
CREATE INDEX `medical_records_doctor_id_idx` ON `medical_records`(`doctor_id`);

-- AddForeignKey
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diagnoses` ADD CONSTRAINT `diagnoses_medical_record_id_fkey` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_medical_record_id_fkey` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription_items` ADD CONSTRAINT `prescription_items_prescription_id_fkey` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

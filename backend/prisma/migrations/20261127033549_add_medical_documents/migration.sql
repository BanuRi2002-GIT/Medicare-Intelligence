-- CreateTable
CREATE TABLE `medical_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `patient_id` INTEGER NOT NULL,
    `uploaded_by_user_id` INTEGER NOT NULL,
    `document_type` ENUM('LAB_REPORT', 'SCAN_REPORT', 'PRESCRIPTION', 'REFERRAL_LETTER', 'DISCHARGE_SUMMARY', 'OTHER') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `stored_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `medical_documents_stored_name_key`(`stored_name`),
    INDEX `medical_documents_patient_id_created_at_idx`(`patient_id`, `created_at`),
    INDEX `medical_documents_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `medical_documents` ADD CONSTRAINT `medical_documents_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_documents` ADD CONSTRAINT `medical_documents_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

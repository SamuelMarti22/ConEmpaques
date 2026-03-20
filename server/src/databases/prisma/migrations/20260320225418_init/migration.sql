/*
  Warnings:

  - You are about to drop the column `created_a` on the `rutas` table. All the data in the column will be lost.
  - You are about to drop the column `horaEntrega` on the `rutas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `rutas` DROP COLUMN `created_a`,
    DROP COLUMN `horaEntrega`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `hora_finalizacion_entrega` VARCHAR(191) NULL,
    ADD COLUMN `hora_inicio_entrega` VARCHAR(191) NULL;

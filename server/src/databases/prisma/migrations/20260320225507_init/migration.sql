/*
  Warnings:

  - You are about to alter the column `hora_finalizacion_entrega` on the `rutas` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - You are about to alter the column `hora_inicio_entrega` on the `rutas` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.

*/
-- AlterTable
ALTER TABLE `rutas` MODIFY `hora_finalizacion_entrega` DATETIME(3) NULL,
    MODIFY `hora_inicio_entrega` DATETIME(3) NULL;

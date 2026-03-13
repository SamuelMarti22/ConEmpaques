-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMIN', 'REPARTIDOR') NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disponibilidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioID` INTEGER NOT NULL,
    `diaDeSemana` INTEGER NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFin` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rutas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `repartidor_id` INTEGER NOT NULL,
    `fecha_reparto` DATETIME(3) NOT NULL,
    `estado_ruta` ENUM('PENDIENTE', 'EN_PROCESO', 'ENTREGADA', 'CANCELADA') NOT NULL,
    `horaEntrega` VARCHAR(191) NOT NULL,
    `created_a` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `disponibilidad` ADD CONSTRAINT `disponibilidad_usuarioID_fkey` FOREIGN KEY (`usuarioID`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rutas` ADD CONSTRAINT `rutas_repartidor_id_fkey` FOREIGN KEY (`repartidor_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

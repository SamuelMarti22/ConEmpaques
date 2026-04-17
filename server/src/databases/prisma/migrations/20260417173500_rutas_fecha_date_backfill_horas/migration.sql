/*
  Normalize route date and backfill legacy schedule timestamps.
*/

-- Keep delivery day as a date-only column.
ALTER TABLE `rutas`
  MODIFY `fecha_reparto` DATE NOT NULL;

-- Legacy records without start time are assumed to begin at 08:00 local.
UPDATE `rutas`
SET `hora_inicio_entrega` = TIMESTAMP(`fecha_reparto`, '08:00:00')
WHERE `hora_inicio_entrega` IS NULL;

-- If end time is missing, derive it from estimated duration; otherwise keep start as fallback.
UPDATE `rutas`
SET `hora_finalizacion_entrega` = CASE
  WHEN `tiempo_estimado` IS NOT NULL AND `tiempo_estimado` > 0
    THEN DATE_ADD(`hora_inicio_entrega`, INTERVAL `tiempo_estimado` SECOND)
  ELSE `hora_inicio_entrega`
END
WHERE `hora_finalizacion_entrega` IS NULL
  AND `hora_inicio_entrega` IS NOT NULL;

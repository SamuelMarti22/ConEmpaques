import type { Request, Response } from 'express';

export interface QueryPaginacion {
  pagina: number;
  porPagina: number;
}

export interface QueryFechas {
  desde: Date;
  hasta: Date;
}

export function validarPaginacion(req: Request, res: Response): QueryPaginacion | null {
  const pagina = Math.max(1, parseInt(req.query.pagina as string) || 1);
  const porPagina = Math.max(1, Math.min(100, parseInt(req.query.porPagina as string) || 10));

  if (!Number.isInteger(pagina) || pagina < 1) {
    res.status(400).json({ error: 'Parámetro pagina debe ser un entero positivo' });
    return null;
  }

  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 100) {
    res.status(400).json({ error: 'Parámetro porPagina debe estar entre 1 y 100' });
    return null;
  }

  return { pagina, porPagina };
}

export function validarFechas(req: Request, res: Response): QueryFechas | null {
  let desde = new Date(req.query.desde as string);
  let hasta = new Date(req.query.hasta as string);

  // Si no vienen parámetros, usar últimos 30 días
  if (!desde || Number.isNaN(desde.getTime())) {
    desde = new Date();
    desde.setDate(desde.getDate() - 30);
  }

  if (!hasta || Number.isNaN(hasta.getTime())) {
    hasta = new Date();
  }

  if (desde > hasta) {
    res.status(400).json({ error: 'La fecha desde no puede ser mayor que hasta' });
    return null;
  }

  return { desde, hasta };
}

export function validarRepartidorId(req: Request, res: Response): number | null {
  const id = parseInt(req.query.repartidorId as string);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'El parámetro repartidorId debe ser un entero positivo' });
    return null;
  }

  return id;
}

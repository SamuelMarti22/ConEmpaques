import type { Request, Response } from "express";
import type { IPuntoEntrega } from "../../databases/mongoDB/schema.js";
import type { RutaRepartidorGeoJSON } from "../../types/routing.types.js";

export interface DatosGuardarRutasRequest {
  puntosEntrega: IPuntoEntrega[];
  rutasRepartidorGeoJSON: RutaRepartidorGeoJSON[];
  fechaReparto: Date;
}

function obtenerRutaIdDesdeParams(request: Request): number {
  return Number(request.params.rutaId);
}

export function validarRutaIdRequest(request: Request, response: Response): number | null {
  const rutaId = obtenerRutaIdDesdeParams(request);

  if (!Number.isInteger(rutaId) || rutaId <= 0) {
    response.status(400).json({ error: "El parámetro rutaId debe ser un entero positivo" });
    return null;
  }

  return rutaId;
}

export function validarGuardarRutasRequest(request: Request, response: Response): DatosGuardarRutasRequest | null {
  const { puntosEntrega, rutasRepartidorGeoJSON, fechaReparto } = request.body as {
    puntosEntrega?: unknown;
    rutasRepartidorGeoJSON?: unknown;
    fechaReparto?: unknown;
  };

  if (!puntosEntrega || !rutasRepartidorGeoJSON || !fechaReparto) {
    response.status(400).json({
      error: "Faltan datos necesarios: puntosEntrega, rutasRepartidorGeoJSON o fechaReparto",
    });
    return null;
  }

  const fechaRepartoNormalizada = new Date(String(fechaReparto));
  if (Number.isNaN(fechaRepartoNormalizada.getTime())) {
    response.status(400).json({ error: "fechaReparto es inválida" });
    return null;
  }

  return {
    puntosEntrega: puntosEntrega as IPuntoEntrega[],
    rutasRepartidorGeoJSON: rutasRepartidorGeoJSON as RutaRepartidorGeoJSON[],
    fechaReparto: fechaRepartoNormalizada,
  };
}

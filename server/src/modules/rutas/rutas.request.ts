import type { Request, Response } from "express";
import type { IPuntoEntrega } from "../../databases/mongoDB/schema.js";
import type { RutaRepartidorGeoJSON } from "../../types/routing.types.js";

export interface DatosGuardarRutasRequest {
  puntosEntrega: IPuntoEntrega[];
  rutasRepartidorGeoJSON: RutaRepartidorGeoJSON[];
  fechaReparto: Date;
  horaInicioRecorrido: string;
}

const PATRON_HORA_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PATRON_FECHA_LOCAL = /^\d{4}-\d{2}-\d{2}$/;

function validarHora(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const horaNormalizada = valor.trim();
  if (!PATRON_HORA_24H.test(horaNormalizada)) {
    return null;
  }

  return horaNormalizada;
}

function normalizarFechaReparto(valor: unknown): Date | null {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      return null;
    }

    return new Date(
      valor.getFullYear(),
      valor.getMonth(),
      valor.getDate(),
      12,
      0,
      0,
      0,
    );
  }

  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();
  if (texto.length === 0) {
    return null;
  }

  if (PATRON_FECHA_LOCAL.test(texto)) {
    const partes = texto.split("-").map(Number);
    if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) {
      return null;
    }

    const [anio, mes, dia] = partes as [number, number, number];
    return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
  }

  const parseada = new Date(texto);
  if (Number.isNaN(parseada.getTime())) {
    return null;
  }

  return new Date(
    parseada.getFullYear(),
    parseada.getMonth(),
    parseada.getDate(),
    12,
    0,
    0,
    0,
  );
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
  const { puntosEntrega, rutasRepartidorGeoJSON, fechaReparto, horaInicioRecorrido } = request.body as {
    puntosEntrega?: unknown;
    rutasRepartidorGeoJSON?: unknown;
    fechaReparto?: unknown;
    horaInicioRecorrido?: unknown;
  };

  if (!puntosEntrega || !rutasRepartidorGeoJSON || !fechaReparto || !horaInicioRecorrido) {
    response.status(400).json({
      error: "Faltan datos necesarios: puntosEntrega, rutasRepartidorGeoJSON, fechaReparto u horaInicioRecorrido",
    });
    return null;
  }

  if (!Array.isArray(rutasRepartidorGeoJSON) || rutasRepartidorGeoJSON.length === 0) {
    response.status(400).json({ error: "Debe enviar al menos una ruta para guardar" });
    return null;
  }

  const existeRutaConRepartidor = rutasRepartidorGeoJSON.some((ruta) => {
    if (!ruta || typeof ruta !== "object") {
      return false;
    }

    const valor = (ruta as { repartidor_id?: unknown }).repartidor_id;
    return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
  });

  if (!existeRutaConRepartidor) {
    response.status(400).json({ error: "Las rutas generadas no tienen repartidor asignado" });
    return null;
  }

  const horaInicioRecorridoValidada = validarHora(horaInicioRecorrido);
  if (!horaInicioRecorridoValidada) {
    response.status(400).json({ error: "horaInicioRecorrido debe tener formato HH:mm" });
    return null;
  }

  const fechaRepartoNormalizada = normalizarFechaReparto(fechaReparto);
  if (!fechaRepartoNormalizada || Number.isNaN(fechaRepartoNormalizada.getTime())) {
    response.status(400).json({ error: "fechaReparto es inválida" });
    return null;
  }

  return {
    puntosEntrega: puntosEntrega as IPuntoEntrega[],
    rutasRepartidorGeoJSON: rutasRepartidorGeoJSON as RutaRepartidorGeoJSON[],
    fechaReparto: fechaRepartoNormalizada,
    horaInicioRecorrido: horaInicioRecorridoValidada,
  };
}

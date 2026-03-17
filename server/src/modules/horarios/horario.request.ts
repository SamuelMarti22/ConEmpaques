import type { Request, Response } from "express";

export interface DatosCrearHorarioRepartidorRequest {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface DatosActualizarHorarioRepartidorRequest {
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
  activo?: boolean;
}

export interface DatosValidarRecepcionRutaRequest {
  fechaHora: Date;
}

const PATRON_HORA_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;

function obtenerHorarioIdDesdeParams(request: Request): number {
  return Number(request.params.horarioId);
}

function validarDiaSemana(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0 || valor > 6) {
    return null;
  }

  return valor;
}

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

export function validarIdHorarioRequest(request: Request, response: Response): number | null {
  const horarioId = obtenerHorarioIdDesdeParams(request);

  if (!Number.isInteger(horarioId) || horarioId <= 0) {
    response.status(400).json({
      mensaje: "El parámetro horarioId debe ser un número entero positivo",
    });
    return null;
  }

  return horarioId;
}

export function validarCuerpoCrearHorarioRequest(
  request: Request,
  response: Response,
): DatosCrearHorarioRepartidorRequest | null {
  const { diaSemana, horaInicio, horaFin, activo } = request.body as {
    diaSemana?: unknown;
    horaInicio?: unknown;
    horaFin?: unknown;
    activo?: unknown;
  };

  const diaSemanaValidado = validarDiaSemana(diaSemana);
  if (diaSemanaValidado === null) {
    response.status(400).json({ mensaje: "diaSemana debe ser un entero entre 0 y 6" });
    return null;
  }

  const horaInicioValidada = validarHora(horaInicio);
  if (!horaInicioValidada) {
    response.status(400).json({ mensaje: "horaInicio debe tener formato HH:mm" });
    return null;
  }

  const horaFinValidada = validarHora(horaFin);
  if (!horaFinValidada) {
    response.status(400).json({ mensaje: "horaFin debe tener formato HH:mm" });
    return null;
  }

  if (typeof activo !== "boolean") {
    response.status(400).json({ mensaje: "activo debe ser un valor booleano" });
    return null;
  }

  return {
    diaSemana: diaSemanaValidado,
    horaInicio: horaInicioValidada,
    horaFin: horaFinValidada,
    activo,
  };
}

export function validarCuerpoActualizarHorarioRequest(
  request: Request,
  response: Response,
): DatosActualizarHorarioRepartidorRequest | null {
  const { diaSemana, horaInicio, horaFin, activo } = request.body as {
    diaSemana?: unknown;
    horaInicio?: unknown;
    horaFin?: unknown;
    activo?: unknown;
  };

  const datosActualizar: DatosActualizarHorarioRepartidorRequest = {};

  if (diaSemana !== undefined) {
    const diaSemanaValidado = validarDiaSemana(diaSemana);
    if (diaSemanaValidado === null) {
      response.status(400).json({ mensaje: "diaSemana debe ser un entero entre 0 y 6" });
      return null;
    }
    datosActualizar.diaSemana = diaSemanaValidado;
  }

  if (horaInicio !== undefined) {
    const horaInicioValidada = validarHora(horaInicio);
    if (!horaInicioValidada) {
      response.status(400).json({ mensaje: "horaInicio debe tener formato HH:mm" });
      return null;
    }
    datosActualizar.horaInicio = horaInicioValidada;
  }

  if (horaFin !== undefined) {
    const horaFinValidada = validarHora(horaFin);
    if (!horaFinValidada) {
      response.status(400).json({ mensaje: "horaFin debe tener formato HH:mm" });
      return null;
    }
    datosActualizar.horaFin = horaFinValidada;
  }

  if (activo !== undefined) {
    if (typeof activo !== "boolean") {
      response.status(400).json({ mensaje: "activo debe ser un valor booleano" });
      return null;
    }
    datosActualizar.activo = activo;
  }

  return datosActualizar;
}

export function validarCuerpoValidarRecepcionRutaRequest(
  request: Request,
  response: Response,
): DatosValidarRecepcionRutaRequest | null {
  const { fechaHora } = request.body as {
    fechaHora?: unknown;
  };

  if (fechaHora === undefined || fechaHora === null) {
    return { fechaHora: new Date() };
  }

  if (typeof fechaHora !== "string" || fechaHora.trim().length === 0) {
    response.status(400).json({ mensaje: "fechaHora debe ser un texto en formato ISO 8601" });
    return null;
  }

  const fechaHoraParseada = new Date(fechaHora);
  if (Number.isNaN(fechaHoraParseada.getTime())) {
    response.status(400).json({ mensaje: "fechaHora no tiene un formato de fecha válido" });
    return null;
  }

  return { fechaHora: fechaHoraParseada };
}

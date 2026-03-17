import type { Request, Response } from "express";
import { RepartidorNoEncontradoError } from "../repartidores/repartidor.service.js";
import {
  HorarioNoEncontradoError,
  HorarioSolapadoError,
  HorarioSinCamposParaActualizarError,
  horarioService,
  RangoHorarioInvalidoError,
} from "./horario.service.js";
import {
  validarCuerpoActualizarHorarioRequest,
  validarCuerpoCrearHorarioRequest,
  validarCuerpoValidarRecepcionRutaRequest,
  validarIdHorarioRequest,
} from "./horario.request.js";
import { validarIdRequest } from "../repartidores/repartidor.request.js";

function manejarErrorController(error: unknown, response: Response): Response {
  if (error instanceof RepartidorNoEncontradoError) {
    return response.status(404).json({ mensaje: error.message });
  }

  if (error instanceof HorarioNoEncontradoError) {
    return response.status(404).json({ mensaje: error.message });
  }

  if (error instanceof HorarioSolapadoError) {
    return response.status(409).json({ mensaje: error.message });
  }

  if (error instanceof HorarioSinCamposParaActualizarError || error instanceof RangoHorarioInvalidoError) {
    return response.status(400).json({ mensaje: error.message });
  }

  return response.status(500).json({
    mensaje: "Error interno del servidor",
    detalle: error instanceof Error ? error.message : "Error desconocido",
  });
}

async function obtenerHorarios(request: Request, response: Response): Promise<Response | void> {
  const repartidorId = validarIdRequest(request, response);
  if (repartidorId === null) {
    return;
  }

  try {
    const horarios = await horarioService.listarHorarios(repartidorId);
    return response.status(200).json(horarios);
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

async function crearHorario(request: Request, response: Response): Promise<Response | void> {
  const repartidorId = validarIdRequest(request, response);
  if (repartidorId === null) {
    return;
  }

  const datosCrear = validarCuerpoCrearHorarioRequest(request, response);
  if (!datosCrear) {
    return;
  }

  try {
    const horarioCreado = await horarioService.crearHorario(repartidorId, datosCrear);
    return response.status(201).json({
      mensaje: "Horario creado correctamente",
      data: horarioCreado,
    });
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

async function actualizarHorario(request: Request, response: Response): Promise<Response | void> {
  const repartidorId = validarIdRequest(request, response);
  if (repartidorId === null) {
    return;
  }

  const horarioId = validarIdHorarioRequest(request, response);
  if (horarioId === null) {
    return;
  }

  const datosActualizar = validarCuerpoActualizarHorarioRequest(request, response);
  if (!datosActualizar) {
    return;
  }

  try {
    const horarioActualizado = await horarioService.actualizarHorario(repartidorId, horarioId, datosActualizar);
    return response.status(200).json({
      mensaje: "Horario actualizado correctamente",
      data: horarioActualizado,
    });
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

async function eliminarHorario(request: Request, response: Response): Promise<Response | void> {
  const repartidorId = validarIdRequest(request, response);
  if (repartidorId === null) {
    return;
  }

  const horarioId = validarIdHorarioRequest(request, response);
  if (horarioId === null) {
    return;
  }

  try {
    await horarioService.eliminarHorario(repartidorId, horarioId);
    return response.status(200).json({
      mensaje: "Horario eliminado correctamente",
    });
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

async function validarRecepcionRuta(request: Request, response: Response): Promise<Response | void> {
  const repartidorId = validarIdRequest(request, response);
  if (repartidorId === null) {
    return;
  }

  const datosValidar = validarCuerpoValidarRecepcionRutaRequest(request, response);
  if (!datosValidar) {
    return;
  }

  try {
    const resultadoValidacion = await horarioService.validarRecepcionRuta(repartidorId, datosValidar.fechaHora);
    return response.status(200).json(resultadoValidacion);
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

export const horarioController = {
  obtenerHorarios,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
  validarRecepcionRuta,
};

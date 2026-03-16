import type { Request, Response } from "express";
import { Prisma } from "../../databases/prisma/generated/prisma/client.js";
import {
  RepartidorConEntregasActivasError,
  RepartidorNoEncontradoError,
  RepartidorSinCamposParaActualizarError,
  repartidorService,
} from "./repartidor.service.js";
import {
  validarCuerpoActualizarRequest,
  validarCuerpoCrearRequest,
  validarIdRequest,
} from "./repartidor.request.js";

function manejarErrorController(error: unknown, response: Response): Response {
  if (error instanceof RepartidorNoEncontradoError) {
    return response.status(404).json({ mensaje: error.message });
  }

  if (error instanceof RepartidorConEntregasActivasError) {
    return response.status(409).json({ mensaje: error.message });
  }

  if (error instanceof RepartidorSinCamposParaActualizarError) {
    return response.status(400).json({ mensaje: error.message });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return response.status(409).json({
        mensaje: "Ya existe un usuario con el email indicado",
      });
    }
  }

  return response.status(500).json({
    mensaje: "Error interno del servidor",
    detalle: error instanceof Error ? error.message : "Error desconocido",
  });
}

async function obtenerTodos(_request: Request, response: Response): Promise<Response> {
  try {
    const repartidores = await repartidorService.listar();
    return response.status(200).json(repartidores);
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

async function obtenerPorId(request: Request, response: Response): Promise<Response | void> {
  const repartidorId = validarIdRequest(request, response);
  if (repartidorId === null) {
    return;
  }

  try {
    const repartidor = await repartidorService.obtenerPorId(repartidorId);

    if (!repartidor) {
      return response.status(404).json({
        mensaje: "No existe un repartidor con el identificador indicado",
      });
    }

    return response.status(200).json(repartidor);
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

async function crear(request: Request, response: Response): Promise<Response | void> {
  const datosCrear = validarCuerpoCrearRequest(request, response);
  if (!datosCrear) {
    return;
  }

  try {
    const repartidorCreado = await repartidorService.crear(datosCrear);
    return response.status(201).json({
      mensaje: "Repartidor registrado correctamente",
      data: repartidorCreado,
    });
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

async function actualizar(request: Request, response: Response): Promise<Response | void> {
  const repartidorId = validarIdRequest(request, response);
  if (repartidorId === null) {
    return;
  }

  const datosActualizar = validarCuerpoActualizarRequest(request, response);
  if (!datosActualizar) {
    return;
  }

  try {
    const repartidorActualizado = await repartidorService.actualizar(repartidorId, datosActualizar);
    return response.status(200).json({
      mensaje: "Repartidor actualizado correctamente",
      data: repartidorActualizado,
    });
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

async function eliminar(request: Request, response: Response): Promise<Response | void> {
  const repartidorId = validarIdRequest(request, response);
  if (repartidorId === null) {
    return;
  }

  try {
    await repartidorService.eliminar(repartidorId);
    return response.status(200).json({
      mensaje: "Repartidor eliminado correctamente",
    });
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

export const repartidorController = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
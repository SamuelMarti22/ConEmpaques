import type { Request, Response } from "express";
import {
    CredencialesInvalidasError,
    UsuarioNoEncontradoError,
    authService,
} from "./auth.service.js";

function manejarErrorController(error: unknown, response: Response): Response {
  if (error instanceof CredencialesInvalidasError) {
    return response.status(401).json({
      error: error.message,
    });
  }

  if (error instanceof UsuarioNoEncontradoError) {
    return response.status(404).json({
      error: error.message,
    });
  }

  return response.status(500).json({
    error: "Error interno del servidor",
    detalle: error instanceof Error ? error.message : "Error desconocido",
  });
}

/**
 * Login para usuarios de logística (rol ADMIN)
 * Body esperado: { email: string, password: string }
 */
async function loginLogistico(request: Request, response: Response): Promise<Response> {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({
        error: "Email y password son requeridos",
      });
    }

    const resultado = await authService.loginLogistico(email, password);
    return response.status(200).json(resultado);
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

/**
 * Login para repartidores (rol REPARTIDOR)
 * Body esperado: { email: string, password: string }
 */
async function loginRepartidor(request: Request, response: Response): Promise<Response> {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({
        error: "Email y password son requeridos",
      });
    }

    const resultado = await authService.loginRepartidor(email, password);
    return response.status(200).json(resultado);
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

/**
 * Login para clientes
 * Body esperado: { codigo: string } - código de pedido/entrega
 */
async function loginCliente(request: Request, response: Response): Promise<Response> {
  try {
    const { codigo } = request.body;

    if (!codigo) {
      return response.status(400).json({
        error: "Código de pedido es requerido",
      });
    }

    const resultado = await authService.loginCliente(codigo);
    return response.status(200).json(resultado);
  } catch (error) {
    return manejarErrorController(error, response);
  }
}

export const authController = {
  loginLogistico,
  loginRepartidor,
  loginCliente,
};

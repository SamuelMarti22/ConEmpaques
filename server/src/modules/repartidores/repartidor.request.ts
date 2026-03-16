import type { Request, Response } from "express";

export interface DatosCrearRepartidorRequest {
  nombre: string;
  email: string;
  password: string;
  capacidadVehiculo: number;
}

export interface DatosActualizarRepartidorRequest {
  nombre?: string;
  email?: string;
  password?: string;
  capacidadVehiculo?: number;
}

function obtenerIdDesdeParams(request: Request): number {
  return Number(request.params.id);
}

export function validarIdRequest(request: Request, response: Response): number | null {
  const id = obtenerIdDesdeParams(request);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({
      mensaje: "El parámetro id debe ser un número entero positivo",
    });
    return null;
  }

  return id;
}

export function validarCuerpoCrearRequest(request: Request, response: Response): DatosCrearRepartidorRequest | null {
  const { nombre, email, password, capacidadVehiculo } = request.body;

  if (typeof nombre !== "string" || nombre.trim().length === 0) {
    response.status(400).json({ mensaje: "El nombre es obligatorio" });
    return null;
  }

  if (typeof email !== "string" || email.trim().length === 0) {
    response.status(400).json({ mensaje: "El email es obligatorio" });
    return null;
  }

  if (typeof password !== "string" || password.trim().length === 0) {
    response.status(400).json({ mensaje: "La contraseña es obligatoria" });
    return null;
  }

  if (typeof capacidadVehiculo !== "number" || !Number.isInteger(capacidadVehiculo) || capacidadVehiculo <= 0) {
    response.status(400).json({
      mensaje: "La capacidad del vehículo debe ser un número entero mayor a 0",
    });
    return null;
  }

  return {
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    capacidadVehiculo,
  };
}

export function validarCuerpoActualizarRequest(request: Request, response: Response): DatosActualizarRepartidorRequest | null {
  const { nombre, email, password, capacidadVehiculo } = request.body as {
    nombre?: unknown;
    email?: unknown;
    password?: unknown;
    capacidadVehiculo?: unknown;
  };

  const datosActualizar: DatosActualizarRepartidorRequest = {};

  if (nombre !== undefined) {
    if (typeof nombre !== "string" || nombre.trim().length === 0) {
      response.status(400).json({ mensaje: "El nombre debe ser texto no vacío" });
      return null;
    }
    datosActualizar.nombre = nombre.trim();
  }

  if (email !== undefined) {
    if (typeof email !== "string" || email.trim().length === 0) {
      response.status(400).json({ mensaje: "El email debe ser texto no vacío" });
      return null;
    }
    datosActualizar.email = email.trim().toLowerCase();
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.trim().length === 0) {
      response.status(400).json({ mensaje: "La contraseña debe ser texto no vacío" });
      return null;
    }
    datosActualizar.password = password.trim();
  }

  if (capacidadVehiculo !== undefined) {
    if (typeof capacidadVehiculo !== "number" || !Number.isInteger(capacidadVehiculo) || capacidadVehiculo <= 0) {
      response.status(400).json({
        mensaje: "La capacidad del vehículo debe ser un número entero mayor a 0",
      });
      return null;
    }
    datosActualizar.capacidadVehiculo = capacidadVehiculo;
  }

  return datosActualizar;
}
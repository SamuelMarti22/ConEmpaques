import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { repartidorController } from "../../src/modules/repartidores/repartidor.controller.js";
import { Prisma } from "../../src/databases/prisma/generated/prisma/client.js";
import { Role } from "../../src/databases/prisma/generated/prisma/enums.js";

// Simula Prisma para controlar respuestas del módulo sin acceder a base de datos.
// Esto permite validar únicamente contrato HTTP y reglas del controlador.
vi.mock("../../src/databases/prisma/lib/prisma.js", () => ({
  prisma: {
    usuario: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ruta: {
      count: vi.fn(),
    },
    disponibilidad: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((cb) =>
      cb({
        usuario: {
          findFirst: vi.fn(),
          delete: vi.fn(),
        },
        ruta: {
          count: vi.fn(),
          deleteMany: vi.fn(),
        },
        disponibilidad: {
          deleteMany: vi.fn(),
        },
      })
    ),
  },
}));

import { prisma } from "../../src/databases/prisma/lib/prisma.js";

type PrismaMock = {
  usuario: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  ruta: {
    count: ReturnType<typeof vi.fn>;
  };
  disponibilidad: {
    deleteMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const prismaMock = prisma as unknown as PrismaMock;

// Crea un Response mínimo con status/json encadenables y guarda payload para aserciones.
const crearRespuesta = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockImplementation((payload) => {
    res.payload = payload;
    return res;
  });
  return res;
};

type RequestDePrueba = {
  params?: Record<string, unknown>;
  body?: unknown;
  query?: Record<string, unknown>;
};

const ejecutar = async (
  metodo: keyof typeof repartidorController,
  reqData: RequestDePrueba
) => {
  // Ejecuta un endpoint del controlador con un request parcial de prueba.
  const res = crearRespuesta();
  await repartidorController[metodo](reqData as Request, res as Response);
  return res;
};

const crearRepartidorMock = (overrides = {}) => ({
  nombre: "Marta",
  email: "marta@test.com",
  password: "123",
  capacidadVehiculo: 10,
  ...overrides,
});

const crearUsuarioDbMock = (overrides = {}) => ({
  id: 1,
  nombre: "Marta",
  email: "marta@test.com",
  password: "hash",
  rol: Role.REPARTIDOR,
  capacidadVehiculo: 10,
  createdAt: new Date("2026-01-01T12:00:00.000Z"),
  ...overrides,
});

// Limpia estado de mocks entre casos para evitar contaminación de pruebas.
beforeEach(() => {
  vi.clearAllMocks();
});

// TESTS
describe("Repartidores", () => {

  // Cubre flujo de creación de repartidor:
  // 1) alta exitosa, 2) conflicto por email duplicado, 3) validaciones de body.
  describe("Crear", () => {

    it("crea un repartidor correctamente", async () => {
      prismaMock.usuario.create.mockResolvedValue(crearUsuarioDbMock());

      const res = await ejecutar("crear", {
        body: crearRepartidorMock(),
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.payload.data.nombre).toBe("Marta");
    });

    it("retorna 409 si el email ya existe", async () => {
      const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype);
      Object.assign(error, {
        code: "P2002",
        message: "Unique constraint failed",
      });
      prismaMock.usuario.create.mockRejectedValue(error);

      const res = await ejecutar("crear", {
        body: crearRepartidorMock(),
      });

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it.each([
      { body: crearRepartidorMock({ nombre: "" }), mensaje: "El nombre es obligatorio" },
      { body: crearRepartidorMock({ password: "" }), mensaje: "La contraseña es obligatoria" },
      {
        body: crearRepartidorMock({ capacidadVehiculo: 0 }),
        mensaje: "La capacidad del vehículo debe ser un número entero mayor a 0",
      },
    ])("retorna 400 cuando el body es inválido", async ({ body, mensaje }) => {
      const res = await ejecutar("crear", { body });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe(mensaje);
    });

  });

  // Cubre eliminación de repartidor:
  // 1) rechazo por id inválido, 2) eliminación permitida, 3) bloqueo por rutas activas.
  describe("Eliminar", () => {

    it("retorna 400 cuando el id es inválido", async () => {
      const res = await ejecutar("eliminar", {
        params: { id: "abc" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro id debe ser un número entero positivo");
    });

    it("elimina si no tiene entregas activas", async () => {
      prismaMock.$transaction.mockImplementation(async (cb) =>
        cb({
          usuario: {
            findFirst: vi.fn().mockResolvedValue({ id: 1 }),
            delete: vi.fn(),
          },
          ruta: {
            count: vi.fn().mockResolvedValue(0),
            deleteMany: vi.fn(),
          },
          disponibilidad: {
            deleteMany: vi.fn(),
          },
        })
      );

      const res = await ejecutar("eliminar", {
        params: { id: "1" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("no elimina si tiene entregas activas", async () => {
      prismaMock.$transaction.mockImplementation(async (cb) =>
        cb({
          usuario: {
            findFirst: vi.fn().mockResolvedValue({ id: 1 }),
            delete: vi.fn(),
          },
          ruta: {
            count: vi.fn().mockResolvedValue(2),
            deleteMany: vi.fn(),
          },
          disponibilidad: {
            deleteMany: vi.fn(),
          },
        })
      );

      const res = await ejecutar("eliminar", {
        params: { id: "1" },
      });

      expect(res.status).toHaveBeenCalledWith(409);
    });

  });

  // Cubre actualización de repartidor:
  // 1) validación de id/body, 2) error por body vacío, 3) no encontrado, 4) actualización exitosa.
  describe("Actualizar", () => {

    it("retorna 400 cuando el id es inválido", async () => {
      const res = await ejecutar("actualizar", {
        params: { id: "0" },
        body: { nombre: "Laura" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro id debe ser un número entero positivo");
    });

    it("actualiza correctamente", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(crearUsuarioDbMock());
      prismaMock.usuario.update.mockResolvedValue(crearUsuarioDbMock({ nombre: "Laura" }));

      const res = await ejecutar("actualizar", {
        params: { id: "1" },
        body: { nombre: "Laura" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.data.nombre).toBe("Laura");
    });

    it("actualiza correctamente con email, password y capacidad", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(crearUsuarioDbMock());
      prismaMock.usuario.update.mockResolvedValue(
        crearUsuarioDbMock({
          nombre: "Laura",
          email: "laura@test.com",
          capacidadVehiculo: 25,
        })
      );

      const res = await ejecutar("actualizar", {
        params: { id: "1" },
        body: {
          nombre: "Laura",
          email: " LAURA@TEST.COM ",
          password: " nueva-clave ",
          capacidadVehiculo: 25,
        },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.data.email).toBe("laura@test.com");
      expect(res.payload.data.capacidadVehiculo).toBe(25);
    });

    it("rechaza una actualización sin campos", async () => {
      const res = await ejecutar("actualizar", {
        params: { id: "1" },
        body: {},
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("Debe enviar al menos un campo para actualizar");
      expect(prismaMock.usuario.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it("retorna 404 si no existe", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(null);

      const res = await ejecutar("actualizar", {
        params: { id: "1" },
        body: { nombre: "Laura" },
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it.each([
      { body: { nombre: "" }, mensaje: "El nombre debe ser texto no vacío" },
      { body: { password: "" }, mensaje: "La contraseña debe ser texto no vacío" },
      {
        body: { capacidadVehiculo: 0 },
        mensaje: "La capacidad del vehículo debe ser un número entero mayor a 0",
      },
    ])("retorna 400 cuando campos de actualización son inválidos", async ({ body, mensaje }) => {
      const res = await ejecutar("actualizar", {
        params: { id: "1" },
        body,
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe(mensaje);
    });

  });

  // Cubre consultas de repartidores:
  // 1) listado general, 2) consulta por id, 3) validación de id y no encontrado.
  describe("Consultar", () => {

    it("retorna 400 si id de consulta es inválido", async () => {
      const res = await ejecutar("obtenerPorId", {
        params: { id: "-1" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro id debe ser un número entero positivo");
    });

    it("obtiene todos los repartidores", async () => {
      prismaMock.usuario.findMany.mockResolvedValue([crearUsuarioDbMock()]);

      const res = await ejecutar("obtenerTodos", {});

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.length).toBe(1);
    });

    it("retorna 404 si no existe por id", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(null);

      const res = await ejecutar("obtenerPorId", {
        params: { id: "1" },
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

  });

  // Cubre disponibilidad de repartidores por fecha:
  // 1) fecha válida, 2) fecha por defecto, 3) errores por tipo/formato inválido.
  describe("Disponibles", () => {

    it("retorna 200 cuando consulta por fecha válida", async () => {
      prismaMock.usuario.findMany.mockResolvedValue([crearUsuarioDbMock()]);

      const res = await ejecutar("obtenerDisponibles", {
        query: { fecha: "2026-04-16" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.length).toBe(1);
    });

    it("retorna 200 cuando no se envía fecha", async () => {
      prismaMock.usuario.findMany.mockResolvedValue([crearUsuarioDbMock()]);

      const res = await ejecutar("obtenerDisponibles", {
        query: {},
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.length).toBe(1);
    });

    it.each([
      {
        query: { fecha: 20260416 },
        mensaje: "fecha debe ser un texto con formato YYYY-MM-DD",
      },
      {
        query: { fecha: "16/04/2026" },
        mensaje: "fecha debe tener formato YYYY-MM-DD",
      },
      {
        query: { fecha: "2026-02-30" },
        mensaje: "fecha no tiene un formato de fecha válido",
      },
    ])("retorna 400 cuando fecha es inválida", async ({ query, mensaje }) => {
      const res = await ejecutar("obtenerDisponibles", { query });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe(mensaje);
    });

  });

});

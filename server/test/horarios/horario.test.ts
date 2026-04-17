import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { horarioController } from "../../src/modules/horarios/horario.controller.js";
import { Role } from "../../src/databases/prisma/generated/prisma/enums.js";

vi.mock("../../src/databases/prisma/lib/prisma.js", () => ({
  prisma: {
    usuario: {
      findFirst: vi.fn(),
    },
    disponibilidad: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    ruta: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../src/databases/prisma/lib/prisma.js";

type PrismaMock = {
  usuario: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  disponibilidad: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  ruta: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

// Response mínimo para aserciones de status y body sin depender de Express real.
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

const ejecutar = async (metodo: keyof typeof horarioController, reqData: RequestDePrueba) => {
  // Ejecuta un método del controlador con request parcial y retorna response capturado.
  const res = crearRespuesta();
  await horarioController[metodo](reqData as Request, res as Response);
  return res;
};

const crearHorarioBodyMock = (overrides = {}) => ({
  diaSemana: 1,
  horaInicio: "08:00",
  horaFin: "12:00",
  activo: true,
  ...overrides,
});

const crearHorarioDbMock = (overrides = {}) => ({
  id: 10,
  usuarioId: 1,
  diaSemana: 1,
  horaInicio: "08:00",
  horaFin: "12:00",
  activo: true,
  ...overrides,
});

beforeEach(() => {
  // Aísla cada caso de prueba limpiando llamadas y resultados previos.
  vi.clearAllMocks();
});

describe("Horarios", () => {
  // Consulta de horarios por repartidor:
  // valida id, reporta repartidor inexistente y retorna lista cuando aplica.
  describe("Obtener horarios", () => {
    it("retorna 400 cuando id de repartidor es inválido", async () => {
      const res = await ejecutar("obtenerHorarios", {
        params: { id: "abc" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro id debe ser un número entero positivo");
    });

    it("retorna 404 cuando el repartidor no existe", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(null);

      const res = await ejecutar("obtenerHorarios", {
        params: { id: "1" },
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.payload.mensaje).toBe("No existe un repartidor con el identificador indicado");
    });

    it("retorna 200 con la lista de horarios", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });
      prismaMock.disponibilidad.findMany.mockResolvedValue([crearHorarioDbMock()]);

      const res = await ejecutar("obtenerHorarios", {
        params: { id: "1" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.length).toBe(1);
    });

    it("retorna 500 con detalle cuando ocurre error inesperado no-Error", async () => {
      prismaMock.usuario.findFirst.mockRejectedValue("fallo inesperado");

      const res = await ejecutar("obtenerHorarios", {
        params: { id: "1" },
      });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.payload).toEqual({
        mensaje: "Error interno del servidor",
        detalle: "Error desconocido",
      });
    });
  });

  // Creación de horario:
  // valida campos de entrada, reglas de negocio (rango y solapamiento) y éxito.
  describe("Crear horario", () => {
    it("retorna 400 cuando id de repartidor es inválido", async () => {
      const res = await ejecutar("crearHorario", {
        params: { id: "abc" },
        body: crearHorarioBodyMock(),
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro id debe ser un número entero positivo");
    });

    it.each([
      { body: crearHorarioBodyMock({ diaSemana: 7 }), mensaje: "diaSemana debe ser un entero entre 0 y 6" },
      { body: crearHorarioBodyMock({ horaInicio: "8:00" }), mensaje: "horaInicio debe tener formato HH:mm" },
      { body: crearHorarioBodyMock({ activo: "si" }), mensaje: "activo debe ser un valor booleano" },
    ])("retorna 400 cuando body crear es inválido", async ({ body, mensaje }) => {
      const res = await ejecutar("crearHorario", {
        params: { id: "1" },
        body,
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe(mensaje);
    });

    it("retorna 400 cuando el rango horario es inválido", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });

      const res = await ejecutar("crearHorario", {
        params: { id: "1" },
        body: crearHorarioBodyMock({ horaInicio: "12:00", horaFin: "12:00" }),
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("La hora de inicio debe ser menor que la hora de fin");
    });

    it("retorna 409 cuando existe solapamiento", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });
      prismaMock.disponibilidad.findFirst.mockResolvedValue({ id: 99 });

      const res = await ejecutar("crearHorario", {
        params: { id: "1" },
        body: crearHorarioBodyMock(),
      });

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.payload.mensaje).toBe("El horario se solapa con otra franja ya registrada para ese día");
    });

    it("retorna 201 cuando crea correctamente", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });
      prismaMock.disponibilidad.findFirst.mockResolvedValue(null);
      prismaMock.disponibilidad.create.mockResolvedValue(crearHorarioDbMock());

      const res = await ejecutar("crearHorario", {
        params: { id: "1" },
        body: crearHorarioBodyMock(),
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.payload.mensaje).toBe("Horario creado correctamente");
      expect(res.payload.data.id).toBe(10);
    });
  });

  // Actualización de horario:
  // valida ids/body, controla existencia, evita solapamientos y confirma actualización.
  describe("Actualizar horario", () => {
    it("retorna 400 cuando id de repartidor es inválido", async () => {
      const res = await ejecutar("actualizarHorario", {
        params: { id: "abc", horarioId: "10" },
        body: { horaInicio: "09:00" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro id debe ser un número entero positivo");
    });

    it("retorna 400 cuando horarioId es inválido", async () => {
      const res = await ejecutar("actualizarHorario", {
        params: { id: "1", horarioId: "0" },
        body: { horaInicio: "09:00" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro horarioId debe ser un número entero positivo");
    });

    it.each([
      { body: { diaSemana: 9 }, mensaje: "diaSemana debe ser un entero entre 0 y 6" },
      { body: { horaInicio: "8:00" }, mensaje: "horaInicio debe tener formato HH:mm" },
      { body: { activo: "true" }, mensaje: "activo debe ser un valor booleano" },
    ])("retorna 400 cuando body actualizar es inválido", async ({ body, mensaje }) => {
      const res = await ejecutar("actualizarHorario", {
        params: { id: "1", horarioId: "10" },
        body,
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe(mensaje);
    });

    it("retorna 400 cuando se actualiza sin campos", async () => {
      const res = await ejecutar("actualizarHorario", {
        params: { id: "1", horarioId: "10" },
        body: {},
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("Debe enviar al menos un campo para actualizar el horario");
    });

    it("retorna 404 cuando el horario no existe", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });
      prismaMock.disponibilidad.findFirst.mockResolvedValue(null);

      const res = await ejecutar("actualizarHorario", {
        params: { id: "1", horarioId: "10" },
        body: { horaInicio: "10:00" },
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.payload.mensaje).toBe("No existe un horario con el identificador indicado para este repartidor");
    });

    it("retorna 409 cuando se solapa al actualizar", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });
      prismaMock.disponibilidad.findFirst
        .mockResolvedValueOnce(crearHorarioDbMock())
        .mockResolvedValueOnce({ id: 98 });

      const res = await ejecutar("actualizarHorario", {
        params: { id: "1", horarioId: "10" },
        body: { horaInicio: "09:00" },
      });

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.payload.mensaje).toBe("El horario se solapa con otra franja ya registrada para ese día");
    });

    it("retorna 200 cuando actualiza correctamente", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });
      prismaMock.disponibilidad.findFirst.mockResolvedValueOnce(crearHorarioDbMock()).mockResolvedValueOnce(null);
      prismaMock.disponibilidad.update.mockResolvedValue(crearHorarioDbMock({ horaInicio: "10:00" }));

      const res = await ejecutar("actualizarHorario", {
        params: { id: "1", horarioId: "10" },
        body: { horaInicio: "10:00" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.mensaje).toBe("Horario actualizado correctamente");
      expect(res.payload.data.horaInicio).toBe("10:00");
    });
  });

  // Eliminación de horario:
  // valida horarioId, reporta no encontrado y confirma borrado exitoso.
  describe("Eliminar horario", () => {
    it("retorna 400 cuando id de repartidor es inválido", async () => {
      const res = await ejecutar("eliminarHorario", {
        params: { id: "abc", horarioId: "10" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro id debe ser un número entero positivo");
    });

    it("retorna 400 cuando horarioId es inválido", async () => {
      const res = await ejecutar("eliminarHorario", {
        params: { id: "1", horarioId: "abc" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro horarioId debe ser un número entero positivo");
    });

    it("retorna 404 cuando no existe el horario", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });
      prismaMock.disponibilidad.deleteMany.mockResolvedValue({ count: 0 });

      const res = await ejecutar("eliminarHorario", {
        params: { id: "1", horarioId: "10" },
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.payload.mensaje).toBe("No existe un horario con el identificador indicado para este repartidor");
    });

    it("retorna 200 cuando elimina correctamente", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, rol: Role.REPARTIDOR });
      prismaMock.disponibilidad.deleteMany.mockResolvedValue({ count: 1 });

      const res = await ejecutar("eliminarHorario", {
        params: { id: "1", horarioId: "10" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.mensaje).toBe("Horario eliminado correctamente");
    });
  });

  // Validación de recepción de ruta:
  // valida fechaHora y cubre los tres estados de negocio (sin horario, ocupado, disponible).
  describe("Validar recepción de ruta", () => {
    it("retorna 400 cuando id de repartidor es inválido", async () => {
      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "abc" },
        body: { fechaHora: "2026-04-16T10:00:00.000Z" },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe("El parámetro id debe ser un número entero positivo");
    });

    it.each([
      {
        body: { fechaHora: 123 },
        mensaje: "fechaHora debe ser un texto en formato ISO 8601",
      },
      {
        body: { fechaHora: "fecha-invalida" },
        mensaje: "fechaHora no tiene un formato de fecha válido",
      },
    ])("retorna 400 cuando fechaHora es inválida", async ({ body, mensaje }) => {
      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body,
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe(mensaje);
    });

    // Cubre validaciones de formato `fecha` + `hora` en el request de validación.
    it.each([
      {
        body: { fecha: "16-04-2026", hora: "10:00" },
        mensaje: "fecha debe tener formato YYYY-MM-DD",
      },
      {
        body: { fecha: "2026-04-16", hora: "8:00" },
        mensaje: "hora debe tener formato HH:mm",
      },
      {
        body: { fecha: "2026-13-16", hora: "10:00" },
        mensaje: "fecha u hora no tienen un formato válido",
      },
    ])("retorna 400 cuando se usa fecha/hora con formato inválido", async ({ body, mensaje }) => {
      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body,
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.mensaje).toBe(mensaje);
    });

    it("retorna 404 cuando repartidor no existe", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(null);

      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body: { fechaHora: "2026-04-16T10:00:00.000Z" },
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.payload.mensaje).toBe("No existe un repartidor con el identificador indicado");
    });

    it("retorna 200 y no puede recibir cuando no hay horario activo", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, capacidadVehiculo: 20 });
      prismaMock.disponibilidad.findFirst.mockResolvedValue(null);

      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body: { fechaHora: "2026-04-16T10:00:00.000Z" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.puedeRecibirRuta).toBe(false);
      expect(res.payload.horarioActivo).toBeNull();
      expect(res.payload.mensaje).toBe("El repartidor no tiene un horario activo para la fecha y hora evaluadas");
    });

    // Verifica la nueva ruta de entrada { fecha, hora } sin usar fechaHora ISO.
    it("retorna 200 cuando se envía fecha + hora válidas", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, capacidadVehiculo: 20 });
      prismaMock.disponibilidad.findFirst.mockResolvedValue({
        id: 55,
        diaSemana: 4,
        horaInicio: "08:00",
        horaFin: "12:00",
      });
      prismaMock.ruta.findMany.mockResolvedValue([]);

      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body: { fecha: "2026-04-16", hora: "10:00" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.puedeRecibirRuta).toBe(true);
    });

    // Si no llega fechaHora/fecha/hora, request debe usar `new Date()` como fallback.
    it("retorna 200 cuando no se envía fechaHora y usa la fecha actual", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, capacidadVehiculo: 20 });
      prismaMock.disponibilidad.findFirst.mockResolvedValue(null);

      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body: {},
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.puedeRecibirRuta).toBe(false);
    });

    it("retorna 200 y no puede recibir cuando ya tiene ruta asignada", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, capacidadVehiculo: 20 });
      prismaMock.disponibilidad.findFirst.mockResolvedValue({
        id: 55,
        diaSemana: 4,
        horaInicio: "08:00",
        horaFin: "12:00",
      });
      prismaMock.ruta.findMany.mockResolvedValue([
        {
          id: 777,
          horaInicioEntrega: new Date("2026-04-16T09:00:00.000Z"),
          horaFinalizacionEntrega: new Date("2026-04-16T11:00:00.000Z"),
        },
      ]);

      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body: { fechaHora: "2026-04-16T10:00:00.000Z" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.puedeRecibirRuta).toBe(false);
      expect(res.payload.mensaje).toBe("El repartidor ya tiene una ruta asignada para esa fecha y hora");
    });

    it("retorna 200 y puede recibir cuando cumple condiciones", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, capacidadVehiculo: 20 });
      prismaMock.disponibilidad.findFirst.mockResolvedValue({
        id: 55,
        diaSemana: 4,
        horaInicio: "08:00",
        horaFin: "12:00",
      });
      prismaMock.ruta.findMany.mockResolvedValue([]);

      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body: { fechaHora: "2026-04-16T10:00:00.000Z" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.puedeRecibirRuta).toBe(true);
      expect(res.payload.repartidor.id).toBe(1);
      expect(res.payload.repartidor.capacidad).toBe(20);
    });

    it("retorna 200 y puede recibir cuando la ruta existe en sabado anterior", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1, capacidadVehiculo: 20 });
      prismaMock.disponibilidad.findFirst.mockResolvedValue({
        id: 55,
        diaSemana: 6,
        horaInicio: "08:00",
        horaFin: "12:00",
      });
      prismaMock.ruta.findMany.mockResolvedValue([
        {
          id: 999,
          fechaReparto: new Date("2026-04-11T12:00:00.000Z"),
          horaInicioEntrega: new Date("2026-04-11T09:00:00.000Z"),
          horaFinalizacionEntrega: new Date("2026-04-11T11:00:00.000Z"),
        },
      ]);

      const res = await ejecutar("validarRecepcionRuta", {
        params: { id: "1" },
        body: { fechaHora: "2026-04-18T10:00:00.000Z" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload.puedeRecibirRuta).toBe(true);
      expect(res.payload.repartidor.id).toBe(1);
    });
  });
});

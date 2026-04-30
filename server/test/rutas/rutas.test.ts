import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IPuntoEntrega } from "../../src/databases/mongoDB/schema";
import type { RutaRepartidorGeoJSON } from "../../src/types/routing.types";

// Construye una respuesta minimalista de Express para inspeccionar status/payload.
const crearRespuesta = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockImplementation((payload) => {
    res.payload = payload;
    return res;
  });
  return res;
};

const esperarRespuesta = (res: ReturnType<typeof crearRespuesta>, status: number, payload: unknown) => {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.payload).toEqual(payload);
};

async function cargarControllerConMocks() {
  // Carga controlador con rutasService mockeado para validar solo contrato HTTP.
  vi.resetModules();
  const listarRutasGuardadasMock = vi.fn();
  const guardarRutaMock = vi.fn();
  const eliminarRutaMock = vi.fn();
  const consultarRutasRepartidorMock = vi.fn();
  const consultarDetalleRutaMock = vi.fn();
  const actualizarEstadoRutaMock = vi.fn();
  const actualizarEstadoPuntoMock = vi.fn();
  const finalizarRutaMock = vi.fn();
  const cancelarRutaMock = vi.fn();
  class RepartidorYaAsignadoErrorMock extends Error {
    constructor(repartidorId: number) {
      super(`El repartidor ${repartidorId} ya tiene una ruta asignada para la fecha seleccionada`);
      this.name = "RepartidorYaAsignadoError";
    }
  }
  class RepartidorDuplicadoEnLoteErrorMock extends Error {
    constructor(repartidorId: number) {
      super(`El repartidor ${repartidorId} aparece repetido en la misma generación de rutas`);
      this.name = "RepartidorDuplicadoEnLoteError";
    }
  }

  vi.doMock("../../src/modules/rutas/rutas.service", () => ({
    RepartidorDuplicadoEnLoteError: RepartidorDuplicadoEnLoteErrorMock,
    RepartidorYaAsignadoError: RepartidorYaAsignadoErrorMock,
    rutasService: {
      listarRutasGuardadas: listarRutasGuardadasMock,
      guardarRuta: guardarRutaMock,
      eliminarRuta: eliminarRutaMock,
      consultarRutasRepartidor: consultarRutasRepartidorMock,
      consultarDetalleRuta: consultarDetalleRutaMock,
      actualizarEstadoRuta: actualizarEstadoRutaMock,
      actualizarEstadoPunto: actualizarEstadoPuntoMock,
      finalizarRuta: finalizarRutaMock,
      cancelarRuta: cancelarRutaMock,
    },
  }));

  const { rutasController } = await import("../../src/modules/rutas/rutas.controller");

  return {
    rutasController,
    listarRutasGuardadasMock,
    guardarRutaMock,
    eliminarRutaMock,
    consultarRutasRepartidorMock,
    consultarDetalleRutaMock,
    actualizarEstadoRutaMock,
    actualizarEstadoPuntoMock,
    finalizarRutaMock,
    cancelarRutaMock,
  };
}

async function cargarRutasServiceConMocks() {
  // Carga rutas.service real, mockeando Prisma y Mongo para probar lógica de servicio.
  vi.resetModules();
  vi.doUnmock("../../src/modules/rutas/rutas.service");
  const prismaMock = {
    ruta: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    usuario: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
  const rutaEntregaModelMock = {
    create: vi.fn(),
    deleteMany: vi.fn(),
    exists: vi.fn().mockResolvedValue(false),
    find: vi.fn(),
    findOne: vi.fn(),
    updateMany: vi.fn(),
    updateOne: vi.fn(),
  };

  vi.doMock("../../src/databases/prisma/lib/prisma.js", () => ({
    prisma: prismaMock,
  }));

  vi.doMock("../../src/databases/mongoDB/models/rutaEntrega.model.js", () => ({
    RutaEntregaModel: rutaEntregaModelMock,
  }));

  const { rutasService } = await import("../../src/modules/rutas/rutas.service");

  return {
    rutasService,
    prismaMock,
    rutaEntregaModelMock,
  };
}

const puntoEntregaMock: IPuntoEntrega = {
  id: 1,
  nombreCliente: "Cliente A",
  codigo: "P001",
  contactoCliente: "3000000000",
  latitud: 6.24,
  longitud: -75.57,
  pesoProducto: 5,
  descripcionEntrega: "Casa",
  direccion: "Calle 10",
  estadoEntrega: "PENDIENTE",
};

// Ruta de entrada en formato GeoJSON, equivalente al payload usado por el frontend.
const rutaGeoJSONMock: RutaRepartidorGeoJSON = {
  repartidor_id: 1,
  ruta: [1],
  distancia_total: 10,
  tiempo_estimado: 300,
  geometria: {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [[-75.57, 6.24]],
    },
  },
};

const crearBodyGuardar = (
  overrides: Partial<{
    puntosEntrega: IPuntoEntrega[];
    rutasRepartidorGeoJSON: unknown[];
    fechaReparto: unknown;
    horaInicioRecorrido: string;
  }> = {},
) => ({
  puntosEntrega: [puntoEntregaMock],
  rutasRepartidorGeoJSON: [rutaGeoJSONMock],
  fechaReparto: "2026-04-16T10:00:00.000Z",
  horaInicioRecorrido: "08:00",
  ...overrides,
});

const crearReqConBody = (body: object) => ({ body } as Request);
const crearReqConParams = (params: Record<string, string>) => ({ params } as unknown as Request);
const FECHA_GUARDAR = new Date("2026-04-16T10:00:00.000Z");

const crearRutaGeoJSON = (overrides: Partial<RutaRepartidorGeoJSON> = {}): RutaRepartidorGeoJSON => ({
  ...rutaGeoJSONMock,
  ...overrides,
});

const ejecutarGuardarController = async (
  rutasController: { guardarRutas: (req: Request, res: Response) => Promise<void> },
  res: ReturnType<typeof crearRespuesta>,
  bodyOverrides: Partial<{
    puntosEntrega: IPuntoEntrega[];
    rutasRepartidorGeoJSON: unknown[];
    fechaReparto: unknown;
    horaInicioRecorrido: string;
  }> = {},
) => {
  await rutasController.guardarRutas(crearReqConBody(crearBodyGuardar(bodyOverrides)), res as Response);
};

const configurarMocksGuardarRuta = ({
  prismaMock,
  rutaEntregaModelMock,
  rutaExistente = [],
  rutaCreada = {
    id: 101,
    fechaReparto: new Date("2026-04-16T10:00:00.000Z"),
    estadoRuta: "EN_PROCESO",
    horaInicioEntrega: new Date("2026-04-16T08:00:00.000Z"),
    horaFinalizacionEntrega: null,
  },
}: {
  prismaMock: any;
  rutaEntregaModelMock: any;
  rutaExistente?: any[];
  rutaCreada?: any;
}) => {
  prismaMock.ruta.findMany.mockResolvedValue(rutaExistente);
  prismaMock.ruta.create.mockResolvedValue(rutaCreada);
  rutaEntregaModelMock.create.mockResolvedValue({});
  prismaMock.usuario.findUnique.mockResolvedValue({
    id: 1,
    nombre: "Ana",
    capacidadVehiculo: 20,
  });
};

const ejecutarGuardarService = (
  rutasService: {
    guardarRuta: (
      puntosEntrega: IPuntoEntrega[],
      rutasRepartidorGeoJSON: RutaRepartidorGeoJSON[],
      fechaReparto: Date | string,
      horaInicioRecorrido: string,
    ) => Promise<any>;
  },
  overrides: Partial<{
    puntosEntrega: IPuntoEntrega[];
    rutasRepartidorGeoJSON: RutaRepartidorGeoJSON[];
    fechaReparto: Date | string;
    horaInicioRecorrido: string;
  }> = {},
) =>
  rutasService.guardarRuta(
    overrides.puntosEntrega ?? [puntoEntregaMock],
    overrides.rutasRepartidorGeoJSON ?? [crearRutaGeoJSON()],
    overrides.fechaReparto ?? FECHA_GUARDAR,
    overrides.horaInicioRecorrido ?? "08:00",
  );

beforeEach(() => {
  // Reinicia llamadas/retornos de mocks entre casos.
  vi.clearAllMocks();
});

describe("Rutas", () => {
  // Controller:
  // cubre listar, guardar y eliminar con validaciones de entrada y errores controlados.
  describe("Controller", () => {
    // Camino feliz de listado: el service responde y el controller envuelve en { rutasGuardadas }.
    it("retorna 200 con rutas guardadas", async () => {
      const { rutasController, listarRutasGuardadasMock } = await cargarControllerConMocks();
      listarRutasGuardadasMock.mockResolvedValue([{ rutaId: 1 }]);
      const req = {} as Request;
      const res = crearRespuesta();

      await rutasController.obtenerRutasGuardadas(req, res as Response);

      esperarRespuesta(res, 200, { rutasGuardadas: [{ rutaId: 1 }] });
    });

    // Garantiza que errores no controlados del service suban como 500 con mensaje trazable.
    it("retorna 500 cuando listar falla", async () => {
      const { rutasController, listarRutasGuardadasMock } = await cargarControllerConMocks();
      listarRutasGuardadasMock.mockRejectedValue(new Error("fallo listar"));
      const req = {} as Request;
      const res = crearRespuesta();

      await rutasController.obtenerRutasGuardadas(req, res as Response);

      esperarRespuesta(res, 500, { error: "fallo listar" });
    });

    // Valida contrato mínimo de guardar: sin los tres campos requeridos se rechaza la petición.
    it("retorna 400 cuando faltan datos requeridos", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConBody({ puntosEntrega: [puntoEntregaMock] });
      const res = crearRespuesta();

      await rutasController.guardarRutas(req, res as Response);

      esperarRespuesta(res, 400, {
        error: "Faltan datos necesarios: puntosEntrega, rutasRepartidorGeoJSON, fechaReparto u horaInicioRecorrido",
      });
    });

    // Este bloque cubre ramas de normalización de fecha con tipos y formatos inválidos.
    it.each([
      { fechaReparto: "fecha-invalida", caso: "string con formato inválido" },
      { fechaReparto: 12345, caso: "valor no string/date" },
      { fechaReparto: "   ", caso: "string vacío" },
      { fechaReparto: new Date("fecha-invalida"), caso: "Date inválido" },
    ])("retorna 400 cuando fechaReparto es $caso", async ({ fechaReparto }) => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConBody(crearBodyGuardar({ fechaReparto }));
      const res = crearRespuesta();

      await rutasController.guardarRutas(req, res as Response);

      esperarRespuesta(res, 400, { error: "fechaReparto es inválida" });
    });

    it("retorna 400 cuando rutasRepartidorGeoJSON está vacío", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const res = crearRespuesta();

      await ejecutarGuardarController(rutasController, res, { rutasRepartidorGeoJSON: [], fechaReparto: "2026-04-16" });

      esperarRespuesta(res, 400, { error: "Debe enviar al menos una ruta para guardar" });
    });

    it("retorna 400 cuando rutas incluyen elementos no objeto", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const res = crearRespuesta();

      await ejecutarGuardarController(rutasController, res, { rutasRepartidorGeoJSON: [null], fechaReparto: "2026-04-16" });

      esperarRespuesta(res, 400, { error: "Las rutas generadas no tienen repartidor asignado" });
    });

    it("retorna 400 cuando horaInicioRecorrido tiene formato inválido", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const res = crearRespuesta();

      await ejecutarGuardarController(rutasController, res, { fechaReparto: "2026-04-16", horaInicioRecorrido: "8:99" });

      esperarRespuesta(res, 400, { error: "horaInicioRecorrido debe tener formato HH:mm" });
    });

    // Camino feliz de guardado: el controller debe responder 201 y devolver rutas guardadas.
    it("retorna 201 cuando guarda rutas correctamente", async () => {
      const { rutasController, guardarRutaMock } = await cargarControllerConMocks();
      guardarRutaMock.mockResolvedValue([{ rutaId: 1 }]);
      const res = crearRespuesta();

      await ejecutarGuardarController(rutasController, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.payload.mensaje).toBe("Rutas guardadas correctamente");
      expect(res.payload.rutasGuardadas).toEqual([{ rutaId: 1 }]);
    });

    // Si el service falla durante persistencia, el controller debe responder 500.
    it("retorna 500 cuando guardarRuta falla", async () => {
      const { rutasController, guardarRutaMock } = await cargarControllerConMocks();
      guardarRutaMock.mockRejectedValue(new Error("fallo guardar"));
      const res = crearRespuesta();

      await ejecutarGuardarController(rutasController, res);

      esperarRespuesta(res, 500, { error: "fallo guardar" });
    });

    // Validación temprana de parámetro: evita ejecutar service con rutaId inválido.
    it("retorna 400 cuando rutaId es invalido", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConParams({ rutaId: "abc" });
      const res = crearRespuesta();

      await rutasController.eliminarRuta(req, res as Response);

      esperarRespuesta(res, 400, { error: "El parámetro rutaId debe ser un entero positivo" });
    });

    it("retorna 409 cuando el repartidor ya tiene ruta asignada", async () => {
      const { rutasController, guardarRutaMock } = await cargarControllerConMocks();
      guardarRutaMock.mockRejectedValue({
        message: "El repartidor 1 ya tiene una ruta asignada para la fecha seleccionada",
      });
      const res = crearRespuesta();

      await ejecutarGuardarController(rutasController, res);

      esperarRespuesta(res, 409, { error: "El repartidor 1 ya tiene una ruta asignada para la fecha seleccionada" });
    });

    // Camino feliz de eliminación: confirma parseo de id y delegación correcta al service.
    it("retorna 200 cuando elimina correctamente", async () => {
      const { rutasController, eliminarRutaMock } = await cargarControllerConMocks();
      eliminarRutaMock.mockResolvedValue(undefined);
      const req = crearReqConParams({ rutaId: "1" });
      const res = crearRespuesta();

      await rutasController.eliminarRuta(req, res as Response);

      expect(eliminarRutaMock).toHaveBeenCalledWith(1);
      esperarRespuesta(res, 200, { mensaje: "Ruta eliminada correctamente" });
    });

    // Errores de negocio de eliminación se exponen como 400 con mensaje útil para UI.
    it("retorna 400 cuando eliminar falla", async () => {
      const { rutasController, eliminarRutaMock } = await cargarControllerConMocks();
      eliminarRutaMock.mockRejectedValue(new Error("No existe la ruta 9"));
      const req = crearReqConParams({ rutaId: "9" });
      const res = crearRespuesta();

      await rutasController.eliminarRuta(req, res as Response);

      esperarRespuesta(res, 400, { error: "No existe la ruta 9" });
    });

    it("retorna 200 cuando consulta rutas por repartidor", async () => {
      const { rutasController, consultarRutasRepartidorMock } = await cargarControllerConMocks();
      consultarRutasRepartidorMock.mockResolvedValue([{ id: 10, cantidadPuntos: 2 }]);
      const req = crearReqConParams({ idRepartidor: "1" });
      const res = crearRespuesta();

      await rutasController.consultarRutasRepartidor(req, res as Response);

      expect(consultarRutasRepartidorMock).toHaveBeenCalledWith(1);
      esperarRespuesta(res, 200, { detalleParadas: [{ id: 10, cantidadPuntos: 2 }] });
    });

    it("retorna 500 cuando consultarRutasRepartidor falla", async () => {
      const { rutasController, consultarRutasRepartidorMock } = await cargarControllerConMocks();
      consultarRutasRepartidorMock.mockRejectedValue(new Error("fallo consulta"));
      const req = crearReqConParams({ idRepartidor: "1" });
      const res = crearRespuesta();

      await rutasController.consultarRutasRepartidor(req, res as Response);

      esperarRespuesta(res, 500, { error: "fallo consulta" });
    });

    it("retorna 400 cuando rutaId es inválido al consultar detalle", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConParams({ rutaId: "0" });
      const res = crearRespuesta();

      await rutasController.consultarDetalleRuta(req, res as Response);

      esperarRespuesta(res, 400, { error: "El parámetro rutaId debe ser un entero positivo" });
    });

    it("retorna 200 cuando consulta detalle de ruta", async () => {
      const { rutasController, consultarDetalleRutaMock } = await cargarControllerConMocks();
      consultarDetalleRutaMock.mockResolvedValue({ rutaId: 15 });
      const req = crearReqConParams({ rutaId: "15" });
      const res = crearRespuesta();

      await rutasController.consultarDetalleRuta(req, res as Response);

      expect(consultarDetalleRutaMock).toHaveBeenCalledWith("15");
      esperarRespuesta(res, 200, { detalleRuta: { rutaId: 15 } });
    });

    // Tests para actualizarEstadoPunto
    it("retorna 400 cuando rutaId es inválido en actualizarEstadoPunto", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConParams({ rutaId: "abc" });
      req.body = { puntoId: 1, nuevoEstado: "ENTREGADO" };
      const res = crearRespuesta();

      await rutasController.actualizarEstadoPunto(req, res as Response);

      esperarRespuesta(res, 400, { error: "El parámetro rutaId debe ser un entero positivo" });
    });

    it("retorna 400 cuando puntoId es inválido en actualizarEstadoPunto", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConParams({ rutaId: "1" });
      req.body = { puntoId: "abc", nuevoEstado: "ENTREGADO" };
      const res = crearRespuesta();

      await rutasController.actualizarEstadoPunto(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload.error).toContain("El campo puntoId debe ser un entero positivo");
    });

    it("retorna 400 cuando nuevoEstado es inválido en actualizarEstadoPunto", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConParams({ rutaId: "1" });
      req.body = { puntoId: 1, nuevoEstado: "ESTADO_INVALIDO" };
      const res = crearRespuesta();

      await rutasController.actualizarEstadoPunto(req, res as Response);

      esperarRespuesta(res, 400, {
        error: "El campo nuevoEstado debe ser uno de los siguientes: EN_BODEGA, PENDIENTE, EN_ENTREGA, EN_CAMINO, ENTREGADO, FALLIDO",
      });
    });

    it("retorna 200 cuando actualiza estado de punto correctamente", async () => {
      const { rutasController, actualizarEstadoPuntoMock } = await cargarControllerConMocks();
      actualizarEstadoPuntoMock.mockResolvedValue(undefined);
      const req = crearReqConParams({ rutaId: "1" });
      req.body = { puntoId: 1, nuevoEstado: "ENTREGADO" };
      const res = crearRespuesta();

      await rutasController.actualizarEstadoPunto(req, res as Response);

      expect(actualizarEstadoPuntoMock).toHaveBeenCalledWith(1, 1, "ENTREGADO");
      esperarRespuesta(res, 200, { mensaje: "Estado del punto actualizado correctamente" });
    });

    it("retorna 500 cuando actualizar estado de punto falla", async () => {
      const { rutasController, actualizarEstadoPuntoMock } = await cargarControllerConMocks();
      actualizarEstadoPuntoMock.mockRejectedValue(new Error("Error al actualizar punto"));
      const req = crearReqConParams({ rutaId: "1" });
      req.body = { puntoId: 1, nuevoEstado: "ENTREGADO" };
      const res = crearRespuesta();

      await rutasController.actualizarEstadoPunto(req, res as Response);

      esperarRespuesta(res, 500, { error: "Error al actualizar punto" });
    });

    // Tests para finalizarRuta
    it("retorna 400 cuando rutaId es inválido en finalizarRuta", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConParams({ rutaId: "0" });
      const res = crearRespuesta();

      await rutasController.finalizarRuta(req, res as Response);

      esperarRespuesta(res, 400, { error: "El parámetro rutaId debe ser un entero positivo" });
    });

    it("retorna 200 cuando finaliza ruta correctamente", async () => {
      const { rutasController, finalizarRutaMock } = await cargarControllerConMocks();
      finalizarRutaMock.mockResolvedValue(undefined);
      const req = crearReqConParams({ rutaId: "5" });
      const res = crearRespuesta();

      await rutasController.finalizarRuta(req, res as Response);

      expect(finalizarRutaMock).toHaveBeenCalledWith(5);
      esperarRespuesta(res, 200, { mensaje: "Ruta finalizada correctamente" });
    });

    it("retorna 500 cuando finalizar ruta falla", async () => {
      const { rutasController, finalizarRutaMock } = await cargarControllerConMocks();
      finalizarRutaMock.mockRejectedValue(new Error("No existe la ruta 999"));
      const req = crearReqConParams({ rutaId: "999" });
      const res = crearRespuesta();

      await rutasController.finalizarRuta(req, res as Response);

      esperarRespuesta(res, 500, { error: "No existe la ruta 999" });
    });

    // Tests para cancelarRuta
    it("retorna 400 cuando rutaId es inválido en cancelarRuta", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = crearReqConParams({ rutaId: "-1" });
      const res = crearRespuesta();

      await rutasController.cancelarRuta(req, res as Response);

      esperarRespuesta(res, 400, { error: "El parámetro rutaId debe ser un entero positivo" });
    });

    it("retorna 200 cuando cancela ruta correctamente", async () => {
      const { rutasController, cancelarRutaMock } = await cargarControllerConMocks();
      cancelarRutaMock.mockResolvedValue(undefined);
      const req = crearReqConParams({ rutaId: "7" });
      const res = crearRespuesta();

      await rutasController.cancelarRuta(req, res as Response);

      expect(cancelarRutaMock).toHaveBeenCalledWith(7);
      esperarRespuesta(res, 200, { mensaje: "Ruta cancelada correctamente" });
    });

    it("retorna 500 cuando cancelar ruta falla", async () => {
      const { rutasController, cancelarRutaMock } = await cargarControllerConMocks();
      cancelarRutaMock.mockRejectedValue(new Error("No existe la ruta 888"));
      const req = crearReqConParams({ rutaId: "888" });
      const res = crearRespuesta();

      await rutasController.cancelarRuta(req, res as Response);

      esperarRespuesta(res, 500, { error: "No existe la ruta 888" });
    });

  });

  // Service:
  // cubre reglas de guardado/listado/eliminación y helpers de transformación.
  describe("Service", () => {
    // Regla de dominio: fecha de reparto inválida debe bloquear el guardado.
    it("lanza error cuando fechaReparto es inválida", async () => {
      const { rutasService } = await cargarRutasServiceConMocks();

      await expect(
        rutasService.guardarRuta([puntoEntregaMock], [rutaGeoJSONMock], "fecha-invalida", "08:00"),
      ).rejects.toThrow("fechaReparto es inválida");
    });

    // Verifica flujo completo de guardado (MySQL + Mongo) y construcción del resumen de salida.
    it("guarda rutas y devuelve resumen", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      configurarMocksGuardarRuta({ prismaMock, rutaEntregaModelMock });

      const salida = await ejecutarGuardarService(rutasService, {
        rutasRepartidorGeoJSON: [crearRutaGeoJSON({ tiempo_estimado: 120 })],
      });

      expect(prismaMock.ruta.create).toHaveBeenCalled();
      expect(rutaEntregaModelMock.create).toHaveBeenCalled();
      expect(salida[0].rutaId).toBe(101);
    });

    it("calcula cargaActualKg ignorando puntos con pesoProducto inválido al guardar", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      configurarMocksGuardarRuta({
        prismaMock,
        rutaEntregaModelMock,
        rutaCreada: {
          id: 302,
          fechaReparto: new Date("2026-04-20T10:00:00.000Z"),
          estadoRuta: "PENDIENTE",
          horaInicioEntrega: new Date("2026-04-20T08:00:00.000Z"),
          horaFinalizacionEntrega: null,
        },
      });

      const puntosConPesosVariados = [
        {
          id: 1,
          nombreCliente: "Cliente A",
          contactoCliente: "3000000001",
          latitud: 6.24,
          longitud: -75.57,
          pesoProducto: 15,
          descripcionEntrega: "Casa",
          direccion: "Calle 1",
        },
        {
          id: 2,
          nombreCliente: "Cliente B",
          contactoCliente: "3000000002",
          latitud: 6.25,
          longitud: -75.58,
          pesoProducto: Number.NaN,
          descripcionEntrega: "Apartamento",
          direccion: "Calle 2",
        },
        {
          id: 3,
          nombreCliente: "Cliente C",
          contactoCliente: "3000000003",
          latitud: 6.26,
          longitud: -75.59,
          pesoProducto: 20,
          descripcionEntrega: "Tienda",
          direccion: "Calle 3",
        },
      ] as any;

      const salida = await ejecutarGuardarService(rutasService, {
        puntosEntrega: puntosConPesosVariados,
        rutasRepartidorGeoJSON: [crearRutaGeoJSON({ ruta: [1, 2, 3] })],
      });

      expect(salida[0].resumen.cargaActualKg).toBe(35);
      expect(salida[0].resumen.numeroPedidos).toBe(3);
    });

    it("lanza error cuando el repartidor aparece repetido en el mismo lote", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      configurarMocksGuardarRuta({
        prismaMock,
        rutaEntregaModelMock,
        rutaCreada: {
          id: 201,
          fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
          estadoRuta: "EN_PROCESO",
          horaInicioEntrega: new Date("2026-04-18T08:00:00.000Z"),
          horaFinalizacionEntrega: null,
        },
      });

      await expect(
        ejecutarGuardarService(rutasService, {
          rutasRepartidorGeoJSON: [crearRutaGeoJSON(), crearRutaGeoJSON({ ruta: [1] })],
          fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
        }),
      ).rejects.toThrow("El repartidor 1 aparece repetido en la misma generación de rutas");

      expect(prismaMock.ruta.create).toHaveBeenCalledTimes(1);
    });

    it("lanza error cuando ya existe una ruta activa del repartidor para esa fecha", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([
        {
          id: 900,
          fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
          horaInicioEntrega: new Date("2026-04-18T13:00:00.000Z"),
          horaFinalizacionEntrega: new Date("2026-04-18T13:30:00.000Z"),
        },
      ]);

      await expect(
        ejecutarGuardarService(rutasService, {
          fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
        }),
      ).rejects.toThrow("El repartidor 1 ya tiene una ruta asignada para la fecha seleccionada");

      expect(prismaMock.ruta.create).not.toHaveBeenCalled();
    });

    it("continúa cuando una ruta activa no tiene horaInicioEntrega", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      configurarMocksGuardarRuta({
        prismaMock,
        rutaEntregaModelMock,
        rutaExistente: [
          {
            id: 901,
            fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
            horaInicioEntrega: null,
            horaFinalizacionEntrega: null,
          },
        ],
        rutaCreada: {
          id: 301,
          fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
          estadoRuta: "PENDIENTE",
          horaInicioEntrega: new Date("2026-04-18T08:00:00.000Z"),
          horaFinalizacionEntrega: null,
        },
      });

      const salida = await ejecutarGuardarService(rutasService, {
        rutasRepartidorGeoJSON: [crearRutaGeoJSON({ tiempo_estimado: 0 })],
        fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
      });

      expect(prismaMock.ruta.create).toHaveBeenCalled();
      expect(salida[0].resumen.horaFinEstimada).toBeNull();
    });

    it("lanza error cuando la ruta contiene un punto inexistente en el lote", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([]);
      prismaMock.ruta.create.mockResolvedValue({
        id: 302,
        fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
        estadoRuta: "PENDIENTE",
        horaInicioEntrega: new Date("2026-04-18T08:00:00.000Z"),
        horaFinalizacionEntrega: null,
      });

      await expect(
        ejecutarGuardarService(rutasService, {
          rutasRepartidorGeoJSON: [crearRutaGeoJSON({ ruta: [999] })],
          fechaReparto: new Date("2026-04-18T12:00:00.000Z"),
        }),
      ).rejects.toThrow("No se encontro el punto de entrega 999 en el lote recibido");
    });

    // Si no hay filas afectadas en MySQL, la ruta no existe y se debe lanzar error.
    it("eliminarRuta lanza error cuando no existe", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findUnique.mockResolvedValue(null);

      await expect(rutasService.eliminarRuta(999)).rejects.toThrow("No existe la ruta 999");
    });

    // Eliminar exitosamente implica limpiar tanto MySQL como documento asociado en Mongo.
    it("eliminarRuta elimina en mysql y mongo cuando existe", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findUnique.mockResolvedValue({ id: 10 });
      prismaMock.ruta.deleteMany.mockResolvedValue({ count: 1 });
      rutaEntregaModelMock.deleteMany.mockResolvedValue({ deletedCount: 1 });

      await rutasService.eliminarRuta(10);

      expect(prismaMock.ruta.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { id: true },
      });
      expect(prismaMock.ruta.deleteMany).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(rutaEntregaModelMock.deleteMany).toHaveBeenCalledWith({ rutaId: 10 });
      expect(rutaEntregaModelMock.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
        prismaMock.ruta.deleteMany.mock.invocationCallOrder[0],
      );
    });

    // Listado sin resultados debe devolver arreglo vacío, no null/undefined.
    it("listarRutasGuardadas retorna arreglo vacío cuando no hay rutas", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([]);

      const salida = await rutasService.listarRutasGuardadas();

      expect(salida).toEqual([]);
    });

    // Comprueba mapeo agregado de datos MySQL + Mongo a la estructura de respuesta final.
    it("listarRutasGuardadas transforma rutas mysql + mongo a resumen", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([
        {
          id: 22,
          repartidorId: 1,
          fechaReparto: new Date("2026-04-16T10:00:00.000Z"),
          estadoRuta: "EN_PROCESO",
          distanciaTotal: 15,
          tiempoEstimado: 600,
          repartidor: {
            id: 1,
            nombre: "Ana",
            capacidadVehiculo: 20,
          },
        },
      ]);
      rutaEntregaModelMock.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            rutaId: 22,
            puntosEntrega: [
              {
                id: 1,
                direccion: "Calle 10",
                nombreCliente: "Cliente A",
                estadoEntrega: "ENTREGADO",
                latitud: 6.24,
                longitud: -75.57,
                pesoProducto: 4,
              },
            ],
            geometria: [[-75.57, 6.24]],
          },
        ]),
      });

      const salida = await rutasService.listarRutasGuardadas();

      expect(salida).toHaveLength(1);
      expect(salida[0].repartidor.estado).toBe("en ruta");
    });

    it("listarRutasGuardadas mapea estado finalizado y geometría no array", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([
        {
          id: 23,
          repartidorId: 2,
          fechaReparto: new Date("2026-04-17T12:00:00.000Z"),
          estadoRuta: "ENTREGADA",
          distanciaTotal: 20,
          tiempoEstimado: 300,
          horaInicioEntrega: new Date("2026-04-17T08:00:00.000Z"),
          horaFinalizacionEntrega: null,
          repartidor: {
            id: 2,
            nombre: "Luis",
            capacidadVehiculo: 25,
          },
        },
      ]);
      rutaEntregaModelMock.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            rutaId: 23,
            puntosEntrega: [
              {
                id: 1,
                direccion: "Calle 10",
                nombreCliente: "Cliente A",
                estadoEntrega: "PENDIENTE",
                latitud: 6.24,
                longitud: -75.57,
                pesoProducto: Number.NaN,
              },
            ],
            geometria: "no-array",
          },
        ]),
      });

      const salida = await rutasService.listarRutasGuardadas();

      expect(salida).toHaveLength(1);
      expect(salida[0].repartidor.estado).toBe("finalizado");
      expect(salida[0].geometria.geometry.coordinates).toEqual([]);
      expect(salida[0].resumen.cargaActualKg).toBe(0);
      expect(salida[0].detalleParadas[0].estadoEntrega).toBe("PENDIENTE");
      expect(salida[0].resumen.horaFinEstimada).not.toBeNull();
    });

    it("depurarRutasAntiguas elimina rutas vencidas en mysql y mongo", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);
      prismaMock.ruta.deleteMany.mockResolvedValue({ count: 2 });
      rutaEntregaModelMock.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            rutaId: 11,
            puntosEntrega: [
              { id: 1, nombreCliente: 'A' },
              { id: 2, nombreCliente: 'B' },
              { id: 3, nombreCliente: 'C' },
            ],
          },
          {
            rutaId: 12,
            puntosEntrega: [
              { id: 4, nombreCliente: 'D' },
            ],
          },
        ]),
      });
      rutaEntregaModelMock.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const resultado = await rutasService.depurarRutasAntiguas(30);

      expect(prismaMock.ruta.findMany).toHaveBeenCalledWith({
        where: {
          fechaReparto: {
            lt: expect.any(Date),
          },
        },
        select: {
          id: true,
        },
      });
      expect(prismaMock.ruta.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [11, 12],
          },
        },
      });
      expect(rutaEntregaModelMock.deleteMany).toHaveBeenCalledWith({
        rutaId: {
          $in: [11, 12],
        },
      });
      expect(rutaEntregaModelMock.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
        prismaMock.ruta.deleteMany.mock.invocationCallOrder[0],
      );
      expect(resultado).toEqual({ rutasEliminadas: 2, documentosMongoEliminados: 2, puntosEliminados: 4 });
    });

    it("depurarRutasAntiguas no elimina nada cuando no hay rutas vencidas", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([]);

      const resultado = await rutasService.depurarRutasAntiguas(30);

      expect(resultado).toEqual({ rutasEliminadas: 0, documentosMongoEliminados: 0, puntosEliminados: 0 });
      expect(prismaMock.ruta.deleteMany).not.toHaveBeenCalled();
      expect(rutaEntregaModelMock.deleteMany).not.toHaveBeenCalled();
    });

    it("consultarRutasRepartidor retorna arreglo vacío cuando no hay rutas", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([]);

      const salida = await rutasService.consultarRutasRepartidor(1);

      expect(salida).toEqual([]);
      expect(prismaMock.ruta.findMany).toHaveBeenCalledWith({
        where: {
          repartidorId: 1,
          fechaReparto: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
        orderBy: {
          fechaReparto: "asc",
        },
        include: {
          repartidor: {
            select: {
              id: true,
              nombre: true,
              capacidadVehiculo: true,
            },
          },
        },
      });
    });

    it("consultarRutasRepartidor calcula cantidadPuntos con respaldo a cero", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findMany.mockResolvedValue([
        {
          id: 50,
          repartidorId: 2,
          fechaReparto: new Date("2026-04-20T00:00:00.000Z"),
          estadoRuta: "PENDIENTE",
          horaInicioEntrega: null,
          horaFinalizacionEntrega: null,
          distanciaTotal: 20,
          tiempoEstimado: 600,
          createdAt: new Date("2026-04-19T10:00:00.000Z"),
        },
      ]);
      rutaEntregaModelMock.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            rutaId: 50,
            puntosEntrega: "no-array",
          },
        ]),
      });

      const salida = await rutasService.consultarRutasRepartidor(2);

      expect(salida).toHaveLength(1);
      expect(salida[0].id).toBe(50);
      expect(salida[0].cantidadPuntos).toBe(0);
    });

    it("consultarDetalleRuta lanza error cuando el id no es numérico", async () => {
      const { rutasService } = await cargarRutasServiceConMocks();

      await expect(rutasService.consultarDetalleRuta("abc")).rejects.toThrow(
        "El ID de la ruta debe ser un número válido",
      );
    });

    it("consultarDetalleRuta lanza error cuando la ruta no existe", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findUnique.mockResolvedValue(null);

      await expect(rutasService.consultarDetalleRuta("77")).rejects.toThrow("No existe la ruta con ID 77");
    });

    it("consultarDetalleRuta lanza error cuando faltan detalles en MongoDB", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findUnique.mockResolvedValue({
        id: 88,
        repartidorId: 1,
        fechaReparto: new Date("2026-04-16T10:00:00.000Z"),
        estadoRuta: "PENDIENTE",
        distanciaTotal: 10,
        tiempoEstimado: 100,
        repartidor: { id: 1, nombre: "Ana", capacidadVehiculo: 20 },
      });
      rutaEntregaModelMock.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(rutasService.consultarDetalleRuta("88")).rejects.toThrow(
        "No se encontraron detalles de la ruta 88 en MongoDB",
      );
    });

    it("consultarDetalleRuta retorna detalle mapeado con geometría vacía si no es array", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findUnique.mockResolvedValue({
        id: 90,
        repartidorId: 2,
        fechaReparto: new Date("2026-04-16T10:00:00.000Z"),
        estadoRuta: "ENTREGADA",
        distanciaTotal: 14,
        tiempoEstimado: 200,
        repartidor: { id: 2, nombre: "Luis", capacidadVehiculo: 25 },
      });
      rutaEntregaModelMock.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          rutaId: 90,
          puntosEntrega: [
            {
              id: 1,
              codigo: "ABC123",
              direccion: "Calle 1",
              nombreCliente: "Cliente A",
              contactoCliente: "3000000000",
              estadoEntrega: "ENTREGADO",
              pesoProducto: 5,
              descripcionEntrega: "Casa",
              latitud: 6.24,
              longitud: -75.57,
            },
          ],
          geometria: "no-array",
        }),
      });

      const salida = await rutasService.consultarDetalleRuta("90");

      expect(salida.rutaId).toBe(90);
      expect(salida.detalleParadas[0].estadoEntrega).toBe("ENTREGADO");
      expect(salida.geometria.geometry.coordinates).toEqual([]);
    });

    it("consultarDetalleRuta ignora puntos con pesoProducto NaN en cálculo de carga", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.findUnique.mockResolvedValue({
        id: 91,
        repartidorId: 3,
        fechaReparto: new Date("2026-04-16T10:00:00.000Z"),
        estadoRuta: "EN_PROCESO",
        distanciaTotal: 15,
        tiempoEstimado: 150,
        repartidor: { id: 3, nombre: "María", capacidadVehiculo: 30 },
      });
      rutaEntregaModelMock.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          rutaId: 91,
          puntosEntrega: [
            {
              id: 1,
              codigo: "XYZ123",
              direccion: "Calle 1",
              nombreCliente: "Cliente A",
              contactoCliente: "3000000001",
              estadoEntrega: "ENTREGADO",
              pesoProducto: 10,
              descripcionEntrega: "Casa",
              latitud: 6.24,
              longitud: -75.57,
            },
            {
              id: 2,
              codigo: "XYZ124",
              direccion: "Calle 2",
              nombreCliente: "Cliente B",
              contactoCliente: "3000000002",
              estadoEntrega: "PENDIENTE",
              pesoProducto: Number.NaN,
              descripcionEntrega: "Apartamento",
              latitud: 6.25,
              longitud: -75.58,
            },
            {
              id: 3,
              codigo: "XYZ125",
              direccion: "Calle 3",
              nombreCliente: "Cliente C",
              contactoCliente: "3000000003",
              estadoEntrega: "PENDIENTE",
              pesoProducto: null,
              descripcionEntrega: "Tienda",
              latitud: 6.26,
              longitud: -75.59,
            },
          ],
          geometria: [[6.24, -75.57], [6.25, -75.58]],
        }),
      });

      const salida = await rutasService.consultarDetalleRuta("91");

      expect(salida.rutaId).toBe(91);
      expect(salida.detalleParadas).toHaveLength(3);
      expect(salida.resumen.cargaActualKg).toBe(10);
      expect(salida.resumen.numeroPedidos).toBe(3);
    });

    it("actualizarEstadoRuta actualiza el estado correctamente", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.updateMany.mockResolvedValue({ count: 1 });

      await rutasService.actualizarEstadoRuta(10, "EN_PROCESO");

      expect(prismaMock.ruta.updateMany).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { estadoRuta: "EN_PROCESO" },
      });
    });

    it("actualizarEstadoRuta lanza error cuando ruta no existe", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.updateMany.mockResolvedValue({ count: 0 });

      await expect(rutasService.actualizarEstadoRuta(999, "EN_PROCESO")).rejects.toThrow(
        "No existe la ruta 999 para actualizar"
      );
    });

    it("actualizarEstadoPuntos actualiza estado de todos los puntos", async () => {
      const { rutasService, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      rutaEntregaModelMock.updateMany = vi.fn().mockResolvedValue({ modifiedCount: 1 });

      await rutasService.actualizarEstadoPuntos(50, "ENTREGADO");

      expect(rutaEntregaModelMock.updateMany).toHaveBeenCalledWith(
        { rutaId: 50 },
        { $set: { "puntosEntrega.$[].estadoEntrega": "ENTREGADO" } }
      );
    });

    it("actualizarEstadoPunto actualiza estado de un punto específico", async () => {
      const { rutasService, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      rutaEntregaModelMock.updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });

      await rutasService.actualizarEstadoPunto(50, 123, "ENTREGADO");

      expect(rutaEntregaModelMock.updateOne).toHaveBeenCalledWith(
        { rutaId: 50, "puntosEntrega.id": 123 },
        { $set: { "puntosEntrega.$.estadoEntrega": "ENTREGADO" } }
      );
    });

    it("finalizarRuta actualiza estado a ENTREGADA y puntos a ENTREGADO", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.updateMany.mockResolvedValue({ count: 1 });
      rutaEntregaModelMock.updateMany = vi.fn().mockResolvedValue({ modifiedCount: 1 });

      await rutasService.finalizarRuta(60);

      expect(prismaMock.ruta.updateMany).toHaveBeenCalledWith({
        where: { id: 60 },
        data: { estadoRuta: "ENTREGADA" },
      });
      expect(rutaEntregaModelMock.updateMany).toHaveBeenCalledWith(
        { rutaId: 60 },
        { $set: { "puntosEntrega.$[].estadoEntrega": "ENTREGADO" } }
      );
    });

    it("cancelarRuta actualiza estado a CANCELADA", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.updateMany.mockResolvedValue({ count: 1 });

      await rutasService.cancelarRuta(70);

      expect(prismaMock.ruta.updateMany).toHaveBeenCalledWith({
        where: { id: 70 },
        data: { estadoRuta: "CANCELADA" },
      });
    });

    it("cancelarRuta lanza error cuando ruta no existe", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.updateMany.mockResolvedValue({ count: 0 });

      await expect(rutasService.cancelarRuta(999)).rejects.toThrow(
        "No existe la ruta 999 para actualizar"
      );
    });
  });
});

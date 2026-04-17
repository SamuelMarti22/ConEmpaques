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

async function cargarControllerConMocks() {
  // Carga controlador con rutasService mockeado para validar solo contrato HTTP.
  vi.resetModules();
  const listarRutasGuardadasMock = vi.fn();
  const guardarRutaMock = vi.fn();
  const eliminarRutaMock = vi.fn();

  vi.doMock("../../src/modules/rutas/rutas.service", () => ({
    rutasService: {
      listarRutasGuardadas: listarRutasGuardadasMock,
      guardarRuta: guardarRutaMock,
      eliminarRuta: eliminarRutaMock,
    },
  }));

  const { rutasController } = await import("../../src/modules/rutas/rutas.controller");

  return {
    rutasController,
    listarRutasGuardadasMock,
    guardarRutaMock,
    eliminarRutaMock,
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
    },
    usuario: {
      findUnique: vi.fn(),
    },
  };
  const rutaEntregaModelMock = {
    create: vi.fn(),
    deleteMany: vi.fn(),
    find: vi.fn(),
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

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload).toEqual({ rutasGuardadas: [{ rutaId: 1 }] });
    });

    // Garantiza que errores no controlados del service suban como 500 con mensaje trazable.
    it("retorna 500 cuando listar falla", async () => {
      const { rutasController, listarRutasGuardadasMock } = await cargarControllerConMocks();
      listarRutasGuardadasMock.mockRejectedValue(new Error("fallo listar"));
      const req = {} as Request;
      const res = crearRespuesta();

      await rutasController.obtenerRutasGuardadas(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.payload).toEqual({ error: "fallo listar" });
    });

    // Valida contrato mínimo de guardar: sin los tres campos requeridos se rechaza la petición.
    it("retorna 400 cuando faltan datos requeridos", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = { body: { puntosEntrega: [puntoEntregaMock] } } as Request;
      const res = crearRespuesta();

      await rutasController.guardarRutas(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload).toEqual({
        error: "Faltan datos necesarios: puntosEntrega, rutasRepartidorGeoJSON o fechaReparto",
      });
    });

    // Protege la entrada contra fechas inválidas antes de llamar a service.
    it("retorna 400 cuando fechaReparto es invalida", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = {
        body: {
          puntosEntrega: [puntoEntregaMock],
          rutasRepartidorGeoJSON: [rutaGeoJSONMock],
          fechaReparto: "fecha-invalida",
        },
      } as Request;
      const res = crearRespuesta();

      await rutasController.guardarRutas(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload).toEqual({ error: "fechaReparto es inválida" });
    });

    // Camino feliz de guardado: el controller debe responder 201 y devolver rutas guardadas.
    it("retorna 201 cuando guarda rutas correctamente", async () => {
      const { rutasController, guardarRutaMock } = await cargarControllerConMocks();
      guardarRutaMock.mockResolvedValue([{ rutaId: 1 }]);
      const req = {
        body: {
          puntosEntrega: [puntoEntregaMock],
          rutasRepartidorGeoJSON: [rutaGeoJSONMock],
          fechaReparto: "2026-04-16T10:00:00.000Z",
        },
      } as Request;
      const res = crearRespuesta();

      await rutasController.guardarRutas(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.payload.mensaje).toBe("Rutas guardadas correctamente");
      expect(res.payload.rutasGuardadas).toEqual([{ rutaId: 1 }]);
    });

    // Si el service falla durante persistencia, el controller debe responder 500.
    it("retorna 500 cuando guardarRuta falla", async () => {
      const { rutasController, guardarRutaMock } = await cargarControllerConMocks();
      guardarRutaMock.mockRejectedValue(new Error("fallo guardar"));
      const req = {
        body: {
          puntosEntrega: [puntoEntregaMock],
          rutasRepartidorGeoJSON: [rutaGeoJSONMock],
          fechaReparto: "2026-04-16T10:00:00.000Z",
        },
      } as Request;
      const res = crearRespuesta();

      await rutasController.guardarRutas(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.payload).toEqual({ error: "fallo guardar" });
    });

    // Validación temprana de parámetro: evita ejecutar service con rutaId inválido.
    it("retorna 400 cuando rutaId es invalido", async () => {
      const { rutasController } = await cargarControllerConMocks();
      const req = { params: { rutaId: "abc" } } as unknown as Request;
      const res = crearRespuesta();

      await rutasController.eliminarRuta(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload).toEqual({ error: "El parámetro rutaId debe ser un entero positivo" });
    });

    // Camino feliz de eliminación: confirma parseo de id y delegación correcta al service.
    it("retorna 200 cuando elimina correctamente", async () => {
      const { rutasController, eliminarRutaMock } = await cargarControllerConMocks();
      eliminarRutaMock.mockResolvedValue(undefined);
      const req = { params: { rutaId: "1" } } as unknown as Request;
      const res = crearRespuesta();

      await rutasController.eliminarRuta(req, res as Response);

      expect(eliminarRutaMock).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload).toEqual({ mensaje: "Ruta eliminada correctamente" });
    });

    // Errores de negocio de eliminación se exponen como 400 con mensaje útil para UI.
    it("retorna 400 cuando eliminar falla", async () => {
      const { rutasController, eliminarRutaMock } = await cargarControllerConMocks();
      eliminarRutaMock.mockRejectedValue(new Error("No existe la ruta 9"));
      const req = { params: { rutaId: "9" } } as unknown as Request;
      const res = crearRespuesta();

      await rutasController.eliminarRuta(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload).toEqual({ error: "No existe la ruta 9" });
    });
  });

  // Service:
  // cubre reglas de guardado/listado/eliminación y helpers de transformación.
  describe("Service", () => {
    // Regla de dominio: fecha de reparto inválida debe bloquear el guardado.
    it("lanza error cuando fechaReparto es inválida", async () => {
      const { rutasService } = await cargarRutasServiceConMocks();

      await expect(rutasService.guardarRuta([puntoEntregaMock], [rutaGeoJSONMock], "fecha-invalida")).rejects.toThrow(
        "fechaReparto es inválida",
      );
    });

    // Verifica flujo completo de guardado (MySQL + Mongo) y construcción del resumen de salida.
    it("guarda rutas y devuelve resumen", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.create.mockResolvedValue({
        id: 101,
        fechaReparto: new Date("2026-04-16T10:00:00.000Z"),
        estadoRuta: "EN_PROCESO",
      });
      rutaEntregaModelMock.create.mockResolvedValue({});
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 1,
        nombre: "Ana",
        capacidadVehiculo: 20,
      });

      const salida = await rutasService.guardarRuta(
        [puntoEntregaMock],
        [{ ...rutaGeoJSONMock, tiempo_estimado: 120 }],
        new Date("2026-04-16T10:00:00.000Z"),
      );

      expect(prismaMock.ruta.create).toHaveBeenCalled();
      expect(rutaEntregaModelMock.create).toHaveBeenCalled();
      expect(salida[0].rutaId).toBe(101);
    });

    // Si no hay filas afectadas en MySQL, la ruta no existe y se debe lanzar error.
    it("eliminarRuta lanza error cuando no existe", async () => {
      const { rutasService, prismaMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.deleteMany.mockResolvedValue({ count: 0 });

      await expect(rutasService.eliminarRuta(999)).rejects.toThrow("No existe la ruta 999");
    });

    // Eliminar exitosamente implica limpiar tanto MySQL como documento asociado en Mongo.
    it("eliminarRuta elimina en mysql y mongo cuando existe", async () => {
      const { rutasService, prismaMock, rutaEntregaModelMock } = await cargarRutasServiceConMocks();
      prismaMock.ruta.deleteMany.mockResolvedValue({ count: 1 });
      rutaEntregaModelMock.deleteMany.mockResolvedValue({ deletedCount: 1 });

      await rutasService.eliminarRuta(10);

      expect(prismaMock.ruta.deleteMany).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(rutaEntregaModelMock.deleteMany).toHaveBeenCalledWith({ rutaId: 10 });
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

    // Helper interno: normaliza un punto y fija estado inicial PENDIENTE.
    it("construirPuntosEntrega retorna punto con estado pendiente", async () => {
      const { rutasService } = await cargarRutasServiceConMocks();
      const punto = rutasService.construirPuntosEntrega(puntoEntregaMock);

      expect(punto.id).toBe(1);
      expect(punto.estadoEntrega).toBe("PENDIENTE");
    });
  });
});

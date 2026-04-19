import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Response simulado de Express para inspeccionar fácilmente status y payload.
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
  // Carga dinámica del controlador con dependencias mockeadas.
  // Objetivo: probar contrato HTTP del controlador sin ejecutar lógica real de servicios.
  vi.resetModules();
  const getRutaOptimaMock = vi.fn();
  const convertirRutaRepartidorAGeoJSONMock = vi.fn();

  vi.doMock("../../src/modules/routing/routing.service", () => ({
    routingService: {
      getRutaOptima: getRutaOptimaMock,
    },
  }));

  vi.doMock("../../src/modules/routing/geojson.service", () => ({
    geoJSONService: {
      convertirRutaRepartidorAGeoJSON: convertirRutaRepartidorAGeoJSONMock,
    },
  }));

  const { routingController } = await import("../../src/modules/routing/routing.controller");
  return {
    routingController,
    getRutaOptimaMock,
    convertirRutaRepartidorAGeoJSONMock,
  };
}

async function cargarRoutingService() {
  // Carga el servicio real con entorno controlado.
  // Objetivo: validar construcción de request, parseo de respuesta y manejo de errores.
  vi.resetModules();
  vi.doUnmock("../../src/modules/routing/routing.service");
  vi.doUnmock("../../src/modules/routing/geojson.service");
  vi.doMock("../../src/config/env.js", () => ({
    default: {
      ROUTING_SERVER: "http://routing-test",
    },
  }));

  const { routingService } = await import("../../src/modules/routing/routing.service");
  return routingService;
}

async function cargarGeoJsonService() {
  // Carga el transformador real de GeoJSON para validar mapeo de geometría.
  vi.resetModules();
  vi.doUnmock("../../src/modules/routing/geojson.service");
  const { geoJSONService } = await import("../../src/modules/routing/geojson.service");
  return geoJSONService;
}

beforeEach(() => {
  // Garantiza aislamiento entre casos limpiando historial de llamadas y retornos.
  vi.clearAllMocks();
});

afterEach(() => {
  // Revierte fetch global mockeado para no contaminar otros bloques de pruebas.
  vi.unstubAllGlobals();
});

describe("Routing", () => {
  // Controller:
  // Verifica que el endpoint /api/routing/optimizar transforme el resultado del servicio
  // a GeoJSON y que ante excepciones responda con 500 y mensaje de error.
  describe("Controller", () => {
    it("retorna rutas transformadas cuando getRutaOptima es exitoso", async () => {
      const { routingController, getRutaOptimaMock, convertirRutaRepartidorAGeoJSONMock } = await cargarControllerConMocks();

      getRutaOptimaMock.mockResolvedValue([
        { repartidor_id: 1, ruta: [1], geometria: [[-75.57, 6.24]], distancia_total: 10, tiempo_estimado: 300 },
      ]);
      convertirRutaRepartidorAGeoJSONMock.mockReturnValue({
        repartidor_id: 1,
        ruta: [1],
        distancia_total: 10,
        tiempo_estimado: 300,
        geometria: { type: "Feature", geometry: { type: "LineString", coordinates: [[-75.57, 6.24]] } },
      });

      const req = {
        body: {
          puntosEntrega: [{ id: 1, latitud: 6.24, longitud: -75.57, peso: 5 }],
          capacidadesRepartidores: [{ id: 1, capacidad: 20 }],
        },
      } as Request;
      const res = crearRespuesta();

      await routingController.getRutaOptima(req, res as Response);

      expect(getRutaOptimaMock).toHaveBeenCalled();
      expect(convertirRutaRepartidorAGeoJSONMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      expect(res.payload.length).toBe(1);
    });

    it("retorna 500 cuando getRutaOptima falla", async () => {
      const { routingController, getRutaOptimaMock } = await cargarControllerConMocks();
      getRutaOptimaMock.mockRejectedValue(new Error("fallo routing"));

      const req = {
        body: {
          puntosEntrega: [],
          capacidadesRepartidores: [],
        },
      } as Request;
      const res = crearRespuesta();

      await routingController.getRutaOptima(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.payload).toEqual({ error: "fallo routing" });
    });
  });

  // RoutingService:
  // Verifica integración con microservicio de optimización:
  // - normaliza capacidades de repartidores
  // - valida estructura de respuesta (debe traer rutas)
  // - devuelve error de dominio cuando hay falla de red o payload inválido.
  describe("RoutingService", () => {
    it("retorna rutas cuando el servidor responde formato válido", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          rutas: [
            {
              repartidor_id: 1,
              ruta: [10],
              geometria: [[-75.57, 6.24]],
              distancia_total: 12,
              tiempo_estimado: 500,
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const salida = await routingService.getRutaOptima(
        [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
        [{ id: 1, capacidad: 25 }],
      );

      expect(fetchMock).toHaveBeenCalled();
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.capacidades_repartidores).toEqual([{ idRepartidor: 1, capacidadRepartidor: 25 }]);
      expect(salida).toHaveLength(1);
    });

    it("lanza error controlado cuando el servidor responde formato inválido", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ resultado: [] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow(
        "Respuesta inválida de servidor de routing: {\"resultado\":[]}",
      );
    });

    it("lanza error controlado cuando fetch falla", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow(
        "No fue posible conectar con el microservicio de optimización",
      );
    });

    it("propaga detalle cuando el microservicio responde error HTTP con JSON", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: vi.fn().mockResolvedValue(JSON.stringify({ detail: "OSRM reportó trayectos no alcanzables" })),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow("El servicio de optimización respondió con error 422. OSRM reportó trayectos no alcanzables");
    });

    it("propaga texto crudo cuando el microservicio responde error HTTP no JSON", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Error interno de optimización"),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow("El servicio de optimización respondió con error 500. Error interno de optimización");
    });

    it("construye mensaje base cuando el microservicio responde error HTTP sin cuerpo", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: vi.fn().mockResolvedValue(""),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow("El servicio de optimización respondió con error 503.");
    });

    it("propaga detalle estructurado cuando HTTP falla sin text() pero con json()", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          detail: {
            error: "Validacion",
            razon: "Payload incompleto",
          },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow("El servicio de optimización respondió con error 400. Validacion: Payload incompleto");
    });

    it("lanza error cuando HTTP exitoso no expone json()", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow("Respuesta inválida de servidor de routing: el servidor no expuso un cuerpo JSON.");
    });

    it("lanza error cuando el microservicio responde rutas vacías", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          rutas: [],
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow("No se pudieron generar rutas. Verifica que la capacidad total de los repartidores sea suficiente para todos los puntos de entrega.");
    });

    it("retorna error genérico cuando fetch rechaza un valor no Error", async () => {
      const routingService = await cargarRoutingService();
      const fetchMock = vi.fn().mockRejectedValue("fallo no tipado");
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        routingService.getRutaOptima(
          [{ id: 10, latitud: 6.24, longitud: -75.57, peso: 3 }],
          [{ id: 1, capacidad: 25 }],
        ),
      ).rejects.toThrow("No fue posible encontrar una ruta optima para esta combinación de puntos de entrega y capacidades de repartidores.");
    });
  });

  // GeoJSONService:
  // Verifica serialización de rutas a Feature/LineString, incluyendo fallback
  // cuando no existen coordenadas (coordenada dummy [0,0]).
  describe("GeoJSONService", () => {
    it("retorna geometria por defecto cuando la ruta no trae coordenadas", async () => {
      const geoJSONService = await cargarGeoJsonService();

      const salida = geoJSONService.convertirRutaRepartidorAGeoJSON({
        repartidor_id: 1,
        ruta: [1, 2],
        geometria: [],
        distancia_total: 10,
        tiempo_estimado: 300,
      });

      expect(salida.geometria.geometry.coordinates).toEqual([[0, 0]]);
    });

    it("retorna geometria real cuando la ruta trae coordenadas", async () => {
      const geoJSONService = await cargarGeoJsonService();
      const coords = [
        [-75.57, 6.24],
        [-75.58, 6.25],
      ];

      const salida = geoJSONService.convertirRutaRepartidorAGeoJSON({
        repartidor_id: 2,
        ruta: [3, 4],
        geometria: coords,
        distancia_total: 20,
        tiempo_estimado: 600,
      });

      expect(salida.geometria.geometry.coordinates).toEqual(coords);
    });
  });
});

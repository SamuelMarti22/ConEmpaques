import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Response mínimo de Express: permite validar status y JSON sin servidor real.
const crearRespuesta = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockImplementation((payload) => {
    res.payload = payload;
    return res;
  });
  return res;
};

// Extrae handlers reales del Router por método y path.
// Objetivo: probar el comportamiento HTTP del router como unidad.
const obtenerHandler = (router: unknown, metodo: "get" | "post", ruta: string) => {
  const capa = (router as any).stack.find(
    (layer: any) => layer.route?.path === ruta && layer.route.methods?.[metodo],
  );
  return capa?.route?.stack?.[0]?.handle as (req: Request, res: Response) => Promise<void> | void;
};

async function cargarControllerConMocks() {
  // Carga dinámica del controlador con servicio mockeado.
  // Objetivo: validar validaciones de entrada y códigos HTTP sin depender de llamadas externas.
  vi.resetModules();
  const geocodificarDireccionMock = vi.fn();
  const obtenerPrediccionesMock = vi.fn();

  vi.doMock("../../src/modules/geoCodificacion/geoCodificacion.service", () => ({
    geocodificarDireccion: geocodificarDireccionMock,
    obtenerPredicciones: obtenerPrediccionesMock,
  }));

  const { default: geoCodificacionRutas } = await import("../../src/modules/geoCodificacion/geoCodificacion.controller");

  return {
    geocodificarDireccionMock,
    obtenerPrediccionesMock,
    handlerGeocodificar: obtenerHandler(geoCodificacionRutas, "post", "/geocodificar"),
    handlerPredicciones: obtenerHandler(geoCodificacionRutas, "get", "/predicciones"),
  };
}

async function cargarServicioConAxiosMock() {
  // Carga servicio real de geocodificación con axios mockeado.
  // Objetivo: cubrir transformación de payload y manejo de errores de red.
  vi.resetModules();
  vi.doUnmock("../../src/modules/geoCodificacion/geoCodificacion.service");
  const axiosGetMock = vi.fn();

  vi.doMock("axios", () => ({
    default: {
      get: axiosGetMock,
    },
  }));

  const modulo = await import("../../src/modules/geoCodificacion/geoCodificacion.service");
  return {
    axiosGetMock,
    geocodificarDireccion: modulo.geocodificarDireccion,
    obtenerPredicciones: modulo.obtenerPredicciones,
  };
}

beforeEach(() => {
  // Asegura aislamiento completo entre pruebas.
  vi.clearAllMocks();
});

describe("GeoCodificacion", () => {
  // Controller:
  // Verifica contrato HTTP del router:
  // - rechaza requests incompletos
  // - retorna 404 cuando no hay resultado
  // - retorna payload esperado en casos exitosos.
  describe("Controller", () => {
    it("retorna 400 cuando direccion no se envia", async () => {
      const { handlerGeocodificar } = await cargarControllerConMocks();
      const req = { body: {} } as unknown as Request;
      const res = crearRespuesta();

      await handlerGeocodificar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload).toEqual({ error: "Dirección requerida" });
    });

    it("retorna 404 cuando no se encuentra la direccion", async () => {
      const { handlerGeocodificar, geocodificarDireccionMock } = await cargarControllerConMocks();
      geocodificarDireccionMock.mockResolvedValue(null);
      const req = { body: { direccion: "Calle 10" } } as unknown as Request;
      const res = crearRespuesta();

      await handlerGeocodificar(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.payload).toEqual({ error: "No se encontró la dirección" });
    });

    it("retorna resultado cuando la direccion existe", async () => {
      const { handlerGeocodificar, geocodificarDireccionMock } = await cargarControllerConMocks();
      geocodificarDireccionMock.mockResolvedValue({
        direccion: "Calle 10, Medellin",
        latitud: 6.24,
        longitud: -75.57,
        confianza: 1,
        tipoResultado: "ROOFTOP",
      });
      const req = { body: { direccion: "Calle 10" } } as unknown as Request;
      const res = crearRespuesta();

      await handlerGeocodificar(req, res);

      expect(res.json).toHaveBeenCalled();
      expect(res.payload.direccion).toBe("Calle 10, Medellin");
    });

    it("retorna 400 cuando input no se envia", async () => {
      const { handlerPredicciones } = await cargarControllerConMocks();
      const req = { query: {} } as unknown as Request;
      const res = crearRespuesta();

      await handlerPredicciones(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.payload).toEqual({ error: "Input requerido" });
    });

    it("retorna predicciones cuando input es valido", async () => {
      const { handlerPredicciones, obtenerPrediccionesMock } = await cargarControllerConMocks();
      obtenerPrediccionesMock.mockResolvedValue([
        {
          id: "abc",
          descripcion: "Calle 10, Medellin",
          mainText: "Calle 10",
          secondaryText: "Medellin",
        },
      ]);
      const req = { query: { input: "Calle" } } as unknown as Request;
      const res = crearRespuesta();

      await handlerPredicciones(req, res);

      expect(res.json).toHaveBeenCalled();
      expect(res.payload.length).toBe(1);
    });
  });

  // Service:
  // Verifica reglas de transformación de datos externos (Google APIs):
  // - mapeo de campos a DTO interno
  // - cálculo de confianza por location_type
  // - fallbacks seguros ante errores y respuestas vacías.
  describe("Service", () => {
    it("retorna null cuando no hay resultados", async () => {
      const { axiosGetMock, geocodificarDireccion } = await cargarServicioConAxiosMock();
      axiosGetMock.mockResolvedValue({ data: { results: [] } });

      const salida = await geocodificarDireccion("Calle 10");

      expect(salida).toBeNull();
    });

    it("retorna dirección geocodificada con confianza según location_type", async () => {
      const { axiosGetMock, geocodificarDireccion } = await cargarServicioConAxiosMock();
      axiosGetMock.mockResolvedValue({
        data: {
          results: [
            {
              formatted_address: "Calle 10, Medellin, Colombia",
              geometry: {
                location: { lat: 6.24, lng: -75.57 },
                location_type: "ROOFTOP",
              },
            },
          ],
        },
      });

      const salida = await geocodificarDireccion("Calle 10");

      expect(salida?.confianza).toBe(1);
      expect(salida?.tipoResultado).toBe("ROOFTOP");
    });

    it("usa confianza por defecto cuando location_type no está mapeado", async () => {
      const { axiosGetMock, geocodificarDireccion } = await cargarServicioConAxiosMock();
      axiosGetMock.mockResolvedValue({
        data: {
          results: [
            {
              formatted_address: "Carrera 50, Medellin, Colombia",
              geometry: {
                location: { lat: 6.25, lng: -75.56 },
                location_type: "UNKNOWN_TYPE",
              },
            },
          ],
        },
      });

      const salida = await geocodificarDireccion("Carrera 50");

      expect(salida?.confianza).toBe(0.5);
    });

    it("retorna null cuando axios lanza error", async () => {
      const { axiosGetMock, geocodificarDireccion } = await cargarServicioConAxiosMock();
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      axiosGetMock.mockRejectedValue(new Error("network"));

      const salida = await geocodificarDireccion("Calle 10");

      expect(salida).toBeNull();
      errorSpy.mockRestore();
    });

    it("retorna predicciones transformadas", async () => {
      const { axiosGetMock, obtenerPredicciones } = await cargarServicioConAxiosMock();
      axiosGetMock.mockResolvedValue({
        data: {
          predictions: [
            {
              place_id: "abc123",
              description: "Calle 10, Medellin",
              structured_formatting: {
                main_text: "Calle 10",
                secondary_text: "Medellin",
              },
            },
          ],
        },
      });

      const salida = await obtenerPredicciones("Calle");

      expect(salida[0].id).toBe("abc123");
    });

    it("retorna arreglo vacío cuando axios falla", async () => {
      const { axiosGetMock, obtenerPredicciones } = await cargarServicioConAxiosMock();
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      axiosGetMock.mockRejectedValue(new Error("timeout"));

      const salida = await obtenerPredicciones("Calle");

      expect(salida).toEqual([]);
      errorSpy.mockRestore();
    });
  });
});

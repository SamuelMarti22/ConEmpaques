import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

async function cargarTrackingControllerConMocks() {
    vi.resetModules();
    const consultarDetalleRutaMock = vi.fn();
    const actualizarEstadoRutaMock = vi.fn();
    const crearSessionMock = vi.fn();
    const obtenerUltimaPosicionMock = vi.fn();
    const eliminarSessionMock = vi.fn();
    const findOneMock = vi.fn();
    const obtenerRoomMock = vi.fn();
    const getSocketServerMock = vi.fn();
    const iniciarSimulacionMock = vi.fn();
    const detenerSimulacionMock = vi.fn();
    const obtenerEstadoSimulacionMock = vi.fn();

    vi.doMock("../../src/modules/rutas/rutas.service", () => ({
        rutasService: {
            consultarDetalleRuta: consultarDetalleRutaMock,
            actualizarEstadoRuta: actualizarEstadoRutaMock,
        },
    }));

    vi.doMock("../../src/databases/mongoDB/models/rutaEntrega.model.js", () => ({
        RutaEntregaModel: {
            findOne: findOneMock,
        },
    }));

    vi.doMock("../../src/sockets/rooms.service", () => ({
        obtenerRoom: obtenerRoomMock,
    }));

    vi.doMock("../../src/sockets/io.gateway.js", () => ({
        getSocketServer: getSocketServerMock,
    }));

    vi.doMock("../../src/modules/tracking/tracking.simulation.service.js", () => ({
        trackingSimulationService: {
            iniciarSimulacion: iniciarSimulacionMock,
            detenerSimulacion: detenerSimulacionMock,
            obtenerEstado: obtenerEstadoSimulacionMock,
        },
    }));

    // Mock global para trackingStore
    const trackingStoreModule = await import("../../src/store/storeTracking.service");
    trackingStoreModule.trackingStore.crearSession = crearSessionMock;
    trackingStoreModule.trackingStore.obtenerUltimaPosicion = obtenerUltimaPosicionMock;
    trackingStoreModule.trackingStore.eliminarSession = eliminarSessionMock;

    const { TrackingController } = await import("../../src/modules/tracking/tracking.controller");
    return {
        controller: new TrackingController(),
        consultarDetalleRutaMock,
        actualizarEstadoRutaMock,
        crearSessionMock,
        findOneMock,
        obtenerRoomMock,
        getSocketServerMock,
        iniciarSimulacionMock,
        detenerSimulacionMock,
        obtenerEstadoSimulacionMock,
        eliminarSessionMock,
        trackingStoreMock: trackingStoreModule.trackingStore,
        obtenerUltimaPosicionMock,
    };
}

describe("TrackingController", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("iniciarTrackingRuta", () => {
        it("devuelve 400 si el parámetro rutaId no es válido", async () => {
            const { controller } = await cargarTrackingControllerConMocks();

            let req = { params: { rutaId: "abc" } } as unknown as Request;
            let res = crearRespuesta();
            await controller.iniciarTrackingRuta(req, res);
            esperarRespuesta(res, 400, {
                error: "El parámetro rutaId debe ser un entero positivo",
            });

            req = { params: { rutaId: "-5" } } as unknown as Request;
            res = crearRespuesta();
            await controller.iniciarTrackingRuta(req, res);
            esperarRespuesta(res, 400, {
                error: "El parámetro rutaId debe ser un entero positivo",
            });

            req = { params: { rutaId: "0" } } as unknown as Request;
            res = crearRespuesta();
            await controller.iniciarTrackingRuta(req, res);
            esperarRespuesta(res, 400, {
                error: "El parámetro rutaId debe ser un entero positivo",
            });
        });

        it("devuelve 404 si consultarDetalleRuta no encuentra la ruta", async () => {
            const {
                controller,
                consultarDetalleRutaMock,
            } = await cargarTrackingControllerConMocks();

            const req = { params: { rutaId: "40" } } as unknown as Request;
            const res = crearRespuesta();

            consultarDetalleRutaMock.mockResolvedValue(null);

            await controller.iniciarTrackingRuta(req, res);

            esperarRespuesta(res, 404, {
                error: "No se encontró la ruta especificada",
            });
        });

        it("inicia el tracking de una ruta correctamente", async () => {
            const {
                controller,
                consultarDetalleRutaMock,
                actualizarEstadoRutaMock,
                crearSessionMock,
                findOneMock,
                obtenerRoomMock,
            } = await cargarTrackingControllerConMocks();

            const req = { params: { rutaId: "40" } } as unknown as Request;
            const res = crearRespuesta();

            consultarDetalleRutaMock.mockResolvedValue({
                repartidor: { id: 1 },
                detalleParadas: [
                    { codigoSeguimiento: "PE-CAF6CD8165" },
                    { codigoSeguimiento: "PE-A6DCC3730E" },
                ],
            });
            actualizarEstadoRutaMock.mockResolvedValue(undefined);
            crearSessionMock.mockReturnValue(undefined);

            const saveMock = vi.fn().mockResolvedValue(undefined);
            const puntosEntrega = [
                { estadoEntrega: "EN_BODEGA" },
                { estadoEntrega: "ENTREGADO" },
            ];
            findOneMock.mockResolvedValue({
                puntosEntrega,
                save: saveMock,
            });
            obtenerRoomMock.mockResolvedValue("room-40");

            await controller.iniciarTrackingRuta(req, res);

            expect(crearSessionMock).toHaveBeenCalledWith(1, ["PE-CAF6CD8165", "PE-A6DCC3730E"], 40);
            expect(actualizarEstadoRutaMock).toHaveBeenCalledWith(40, expect.anything());
            expect(obtenerRoomMock).toHaveBeenCalledWith(40);
            expect(puntosEntrega[0].estadoEntrega).toBe("EN_ENTREGA");
            expect(puntosEntrega[1].estadoEntrega).toBe("ENTREGADO");
            expect(saveMock).toHaveBeenCalled();
            esperarRespuesta(res, 200, {
                mensaje: "Tracking iniciado correctamente",
                data: {
                    rutaId: 40,
                    idRepartidor: 1,
                    room: "room-40",
                },
            });
        });

        it("devuelve error si consultarDetalleRuta falla", async () => {
            const {
                controller,
                consultarDetalleRutaMock,
            } = await cargarTrackingControllerConMocks();

            const req = { params: { rutaId: "40" } } as unknown as Request;
            const res = crearRespuesta();

            consultarDetalleRutaMock.mockRejectedValue(new Error("No se encontró la ruta"));

            await controller.iniciarTrackingRuta(req, res);

            esperarRespuesta(res, 500, {
                mensaje: "Error al iniciar tracking de la ruta",
                error: "No se encontró la ruta",
            });
        });
    });

    describe("obtenerUbicacionRepartidor", () => {
        it("devuelve la ubicación actual si existe", async () => {
            const { controller, obtenerUltimaPosicionMock } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "123" } } as unknown as Request;
            const res = crearRespuesta();

            // Mock de la posición
            const now = Date.now();
            const mockPos = { lat: 10, lng: 20, timestamp: now };
            obtenerUltimaPosicionMock.mockReturnValue(mockPos);

            await controller.obtenerUbicacionRepartidor(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.payload.mensaje).toBe("Ubicación actual");
            expect(res.payload.data.lat).toBe(10);
            expect(res.payload.data.lng).toBe(20);
            expect(res.payload.data.timestamp).toBe(now);
            expect(typeof res.payload.data.hace).toBe("string");
        });

        it("devuelve 404 si no hay ubicación registrada", async () => {
            const { controller, obtenerUltimaPosicionMock } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "123" } } as unknown as Request;
            const res = crearRespuesta();

            obtenerUltimaPosicionMock.mockReturnValue(undefined);

            await controller.obtenerUbicacionRepartidor(req, res);

            esperarRespuesta(res, 404, {
                error: 'No hay ubicación registrada para esta ruta'
            });
        });

        it("devuelve 500 si ocurre un error inesperado", async () => {
            const { controller, obtenerUltimaPosicionMock } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "123" } } as unknown as Request;
            const res = crearRespuesta();

            obtenerUltimaPosicionMock.mockImplementation(() => { throw new Error("DB error"); });

            await controller.obtenerUbicacionRepartidor(req, res);

            esperarRespuesta(res, 500, {
                error: 'Error al obtener ubicación'
            });
        });
    });

    describe("iniciarSimulacionRuta", () => {
        it("devuelve 400 si el rutaId no es válido", async () => {
            const { controller } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "abc" }, body: {} } as unknown as Request;
            const res = crearRespuesta();

            await controller.iniciarSimulacionRuta(req, res);

            esperarRespuesta(res, 400, {
                error: "El parámetro rutaId debe ser un entero positivo",
            });
        });

        it("devuelve 503 si socket.io no está disponible", async () => {
            const { controller, getSocketServerMock } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "40" }, body: {} } as unknown as Request;
            const res = crearRespuesta();

            getSocketServerMock.mockReturnValue(null);

            await controller.iniciarSimulacionRuta(req, res);

            esperarRespuesta(res, 503, {
                error: "Socket.io no está disponible en este momento",
            });
        });

        it("devuelve 400 cuando la ruta no tiene coordenadas válidas", async () => {
            const {
                controller,
                getSocketServerMock,
                consultarDetalleRutaMock,
            } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "40" }, body: {} } as unknown as Request;
            const res = crearRespuesta();

            getSocketServerMock.mockReturnValue({ to: vi.fn() });
            consultarDetalleRutaMock.mockResolvedValue({
                repartidor: { id: 1 },
                detalleParadas: [{ codigoSeguimiento: "P1" }],
                geometria: {
                    geometry: {
                        coordinates: [["x", "y"]],
                    },
                },
            });

            await controller.iniciarSimulacionRuta(req, res);

            esperarRespuesta(res, 400, {
                error: "La ruta no tiene coordenadas para simular tracking",
            });
        });

        it("inicia simulación correctamente con intervalo default", async () => {
            const {
                controller,
                getSocketServerMock,
                consultarDetalleRutaMock,
                obtenerRoomMock,
                crearSessionMock,
                actualizarEstadoRutaMock,
                iniciarSimulacionMock,
                obtenerUltimaPosicionMock,
            } = await cargarTrackingControllerConMocks();
            const ioMock = { to: vi.fn() };
            const req = {
                params: { rutaId: "40" },
                body: { intervaloMs: 500 },
            } as unknown as Request;
            const res = crearRespuesta();

            getSocketServerMock.mockReturnValue(ioMock);
            consultarDetalleRutaMock.mockResolvedValue({
                repartidor: { id: 7 },
                detalleParadas: [{ codigoSeguimiento: "P1" }, { codigoSeguimiento: "P2" }],
                geometria: {
                    geometry: {
                        coordinates: [[-74.1, 4.6], [-74.11, 4.61]],
                    },
                },
            });
            obtenerRoomMock.mockResolvedValue("room-40");
            actualizarEstadoRutaMock.mockResolvedValue(undefined);
            iniciarSimulacionMock.mockReturnValue({ activa: true, rutaId: 40 });
            obtenerUltimaPosicionMock.mockReturnValue({ lat: 4.6, lng: -74.1, timestamp: 123 });

            await controller.iniciarSimulacionRuta(req, res);

            expect(crearSessionMock).toHaveBeenCalledWith(7, ["P1", "P2"], 40);
            expect(actualizarEstadoRutaMock).toHaveBeenCalledWith(40, expect.anything());
            expect(iniciarSimulacionMock).toHaveBeenCalledWith({
                io: ioMock,
                rutaId: 40,
                idRepartidor: 7,
                room: "room-40",
                coordenadas: [
                    { lng: -74.1, lat: 4.6 },
                    { lng: -74.11, lat: 4.61 },
                ],
                intervaloMs: 5000,
            });
            esperarRespuesta(res, 200, {
                mensaje: "Simulación de tracking iniciada",
                data: {
                    activa: true,
                    rutaId: 40,
                    ubicacionInicial: { lat: 4.6, lng: -74.1, timestamp: 123 },
                },
            });
        });

        it("usa intervalo del body cuando es >= 1000", async () => {
            const {
                controller,
                getSocketServerMock,
                consultarDetalleRutaMock,
                obtenerRoomMock,
                iniciarSimulacionMock,
                obtenerUltimaPosicionMock,
            } = await cargarTrackingControllerConMocks();
            const req = {
                params: { rutaId: "41" },
                body: { intervaloMs: 2500 },
            } as unknown as Request;
            const res = crearRespuesta();

            getSocketServerMock.mockReturnValue({ to: vi.fn() });
            consultarDetalleRutaMock.mockResolvedValue({
                repartidor: { id: 9 },
                detalleParadas: [{ codigoSeguimiento: "P1" }],
                geometria: {
                    geometry: {
                        coordinates: [[-74.2, 4.7]],
                    },
                },
            });
            obtenerRoomMock.mockResolvedValue("room-41");
            iniciarSimulacionMock.mockReturnValue({ activa: true, rutaId: 41 });
            obtenerUltimaPosicionMock.mockReturnValue(null);

            await controller.iniciarSimulacionRuta(req, res);

            expect(iniciarSimulacionMock).toHaveBeenCalledWith(
                expect.objectContaining({ intervaloMs: 2500 })
            );
        });

        it("devuelve 500 si ocurre un error inesperado", async () => {
            const {
                controller,
                getSocketServerMock,
                consultarDetalleRutaMock,
            } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "40" }, body: {} } as unknown as Request;
            const res = crearRespuesta();

            getSocketServerMock.mockReturnValue({ to: vi.fn() });
            consultarDetalleRutaMock.mockRejectedValue(new Error("Fallo simulación"));

            await controller.iniciarSimulacionRuta(req, res);

            esperarRespuesta(res, 500, {
                mensaje: "Error al iniciar la simulación de tracking",
                error: "Fallo simulación",
            });
        });
    });

    describe("detenerSimulacionRuta", () => {
        it("devuelve 400 si el rutaId no es válido", async () => {
            const { controller } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "0" } } as unknown as Request;
            const res = crearRespuesta();

            await controller.detenerSimulacionRuta(req, res);

            esperarRespuesta(res, 400, {
                error: "El parámetro rutaId debe ser un entero positivo",
            });
        });

        it("detiene la simulación y elimina sesión", async () => {
            const {
                controller,
                detenerSimulacionMock,
                eliminarSessionMock,
            } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "44" } } as unknown as Request;
            const res = crearRespuesta();

            detenerSimulacionMock.mockReturnValue({ activa: true, ultimoIndice: 5 });

            await controller.detenerSimulacionRuta(req, res);

            expect(detenerSimulacionMock).toHaveBeenCalledWith(44);
            expect(eliminarSessionMock).toHaveBeenCalledWith(44);
            esperarRespuesta(res, 200, {
                mensaje: "Simulación detenida",
                data: {
                    rutaId: 44,
                    detenida: true,
                    estadoAnterior: { activa: true, ultimoIndice: 5 },
                },
            });
        });
    });

    describe("estadoSimulacionRuta", () => {
        it("devuelve 400 si el rutaId no es válido", async () => {
            const { controller } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "-1" } } as unknown as Request;
            const res = crearRespuesta();

            await controller.estadoSimulacionRuta(req, res);

            esperarRespuesta(res, 400, {
                error: "El parámetro rutaId debe ser un entero positivo",
            });
        });

        it("retorna activa false cuando no hay simulación", async () => {
            const {
                controller,
                obtenerEstadoSimulacionMock,
            } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "45" } } as unknown as Request;
            const res = crearRespuesta();

            obtenerEstadoSimulacionMock.mockReturnValue(null);

            await controller.estadoSimulacionRuta(req, res);

            esperarRespuesta(res, 200, {
                mensaje: "Estado de simulación consultado",
                data: {
                    rutaId: 45,
                    activa: false,
                    simulacion: null,
                },
            });
        });

        it("retorna activa true cuando hay simulación", async () => {
            const {
                controller,
                obtenerEstadoSimulacionMock,
            } = await cargarTrackingControllerConMocks();
            const req = { params: { rutaId: "46" } } as unknown as Request;
            const res = crearRespuesta();

            const estado = { activa: true, indiceActual: 2 };
            obtenerEstadoSimulacionMock.mockReturnValue(estado);

            await controller.estadoSimulacionRuta(req, res);

            esperarRespuesta(res, 200, {
                mensaje: "Estado de simulación consultado",
                data: {
                    rutaId: 46,
                    activa: true,
                    simulacion: estado,
                },
            });
        });
    });
});
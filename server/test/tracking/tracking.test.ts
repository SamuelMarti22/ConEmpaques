import type { Request, Response } from "express";
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
    const findOneMock = vi.fn();
    const obtenerRoomMock = vi.fn();

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

    // Mock global para trackingStore
    const trackingStoreModule = await import("../../src/store/storeTracking.service");
    trackingStoreModule.trackingStore.crearSession = crearSessionMock;
    trackingStoreModule.trackingStore.obtenerUltimaPosicion = obtenerUltimaPosicionMock;

    const { TrackingController } = await import("../../src/modules/tracking/tracking.controller");
    return {
        controller: new TrackingController(),
        consultarDetalleRutaMock,
        actualizarEstadoRutaMock,
        crearSessionMock,
        findOneMock,
        obtenerRoomMock,
        trackingStoreMock: trackingStoreModule.trackingStore,
        obtenerUltimaPosicionMock,
    };
}

describe("TrackingController", () => {
    it("actualiza puntosEntrega a PENDIENTE si estaban en EN_BODEGA", async () => {
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
            detalleParadas: [{ codigoSeguimiento: "P1" }],
        });
        actualizarEstadoRutaMock.mockResolvedValue(undefined);
        crearSessionMock.mockReturnValue(undefined);

        // Mock de puntosEntrega con estado EN_BODEGA y otro estado
        const saveMock = vi.fn().mockResolvedValue(undefined);
        const puntosEntrega = [
            { estadoEntrega: "EN_BODEGA" },
            { estadoEntrega: "ENTREGADO" }
        ];
        findOneMock.mockResolvedValue({
            puntosEntrega,
            save: saveMock,
        });
        obtenerRoomMock.mockResolvedValue("room-40");

        await controller.iniciarTrackingRuta(req, res);

        expect(puntosEntrega[0].estadoEntrega).toBe("EN_ENTREGA");
        expect(puntosEntrega[1].estadoEntrega).toBe("ENTREGADO");
        expect(saveMock).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
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


            it("devuelve 400 si el parámetro rutaId no es válido", async () => {
                const { controller } = await cargarTrackingControllerConMocks();

                // Prueba con un string no numérico
                let req = { params: { rutaId: "abc" } } as unknown as Request;
                let res = crearRespuesta();
                await controller.iniciarTrackingRuta(req, res);
                esperarRespuesta(res, 400, {
                    error: 'El parámetro rutaId debe ser un entero positivo'
                });

                // Prueba con un número negativo
                req = { params: { rutaId: "-5" } } as unknown as Request;
                res = crearRespuesta();
                await controller.iniciarTrackingRuta(req, res);
                esperarRespuesta(res, 400, {
                    error: 'El parámetro rutaId debe ser un entero positivo'
                });

                // Prueba con cero
                req = { params: { rutaId: "0" } } as unknown as Request;
                res = crearRespuesta();
                await controller.iniciarTrackingRuta(req, res);
                esperarRespuesta(res, 400, {
                    error: 'El parámetro rutaId debe ser un entero positivo'
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
                error: 'No se encontró la ruta especificada'
            });
        });
    beforeEach(() => {
        vi.clearAllMocks();
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
            detalleParadas: [{ codigoSeguimiento: "PE-CAF6CD8165" }, { codigoSeguimiento: "PE-A6DCC3730E" }],
        });
        actualizarEstadoRutaMock.mockResolvedValue(undefined);
        crearSessionMock.mockReturnValue(undefined);
        findOneMock.mockResolvedValue({
            puntosEntrega: [{ estadoEntrega: "EN_BODEGA" }],
            save: vi.fn().mockResolvedValue(undefined),
        });
        obtenerRoomMock.mockResolvedValue("room-40");

        await controller.iniciarTrackingRuta(req, res);

        expect(crearSessionMock).toHaveBeenCalledWith(1, ["PE-CAF6CD8165", "PE-A6DCC3730E"], 40);
        expect(actualizarEstadoRutaMock).toHaveBeenCalledWith(40, expect.anything());
        expect(obtenerRoomMock).toHaveBeenCalledWith(40);
        esperarRespuesta(res, 200, {
            mensaje: 'Tracking iniciado correctamente',
            data: {
                rutaId: 40,
                idRepartidor: 1,
                room: "room-40"
            }
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
            error: "No se encontró la ruta"
        });
    });
});
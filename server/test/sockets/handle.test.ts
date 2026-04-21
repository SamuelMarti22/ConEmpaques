import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Server, Socket } from "socket.io";
import { registerHandlers } from "../../src/sockets/handle";

vi.mock("../../src/store/storeTracking.service", () => ({
    trackingStore: {
        crearSession: vi.fn(),
        agregarPosicion: vi.fn(),
        obtenerUltimaPosicion: vi.fn(),
        eliminarSession: vi.fn(),
    }
}));

vi.mock("../../src/sockets/rooms.service", () => ({
    obtenerRoom: vi.fn(),
}));

const { trackingStore } = await import("../../src/store/storeTracking.service");
const { obtenerRoom } = await import("../../src/sockets/rooms.service");

describe("registerHandlers", () => {
    let mockIo: any;
    let mockSocket: any;
    let eventHandlers: Record<string, (arg?: any) => void>;

    beforeEach(() => {
        vi.clearAllMocks();
        eventHandlers = {};

        mockSocket = {
            on: vi.fn((event: string, handler: (arg?: any) => void) => {
                eventHandlers[event] = handler;
                return mockSocket;
            }),
            join: vi.fn(),
            leave: vi.fn(),
            emit: vi.fn(),
            data: {},
        };

        mockIo = {
            to: vi.fn(() => ({
                emit: vi.fn(),
            })),
        };

        registerHandlers(mockIo, mockSocket);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("driver:start", () => {
        it("crea session, une socket a room y guarda datos", async () => {
            vi.mocked(obtenerRoom).mockResolvedValue("room-123");

            await eventHandlers["driver:start"]({
                idRepartidor: 1,
                puntos: ["P1", "P2"],
                idRuta: 100,
            });

            expect(trackingStore.crearSession).toHaveBeenCalledWith(1, ["P1", "P2"], 100);
            expect(obtenerRoom).toHaveBeenCalledWith(100);
            expect(mockSocket.join).toHaveBeenCalledWith("room-123");
            expect(mockSocket.data).toEqual({
                idRepartidor: 1,
                idRuta: 100,
            });
        });

        it("emite error si obtenerRoom falla", async () => {
            vi.mocked(obtenerRoom).mockRejectedValue(new Error("error obtener room"));

            await eventHandlers["driver:start"]({
                idRepartidor: 1,
                puntos: ["P1"],
                idRuta: 100,
            });

            expect(mockSocket.emit).toHaveBeenCalledWith("error", {
                mensaje: "Error al iniciar tracking",
            });
        });
    });

    describe("driver:location", () => {
        it("emite error si no hay idRepartidor o idRuta", async () => {
            mockSocket.data = {};

            await eventHandlers["driver:location"]({
                lat: 10.5,
                lng: 20.5,
                eta: 300,
            });

            expect(mockSocket.emit).toHaveBeenCalledWith("error", {
                codigo: "FALTA_REPARTIDOR_RUTA",
                mensaje: expect.stringContaining("No se encontró repartidor o ruta"),
            });
        });

        it("agrega posición y emite location:update", async () => {
            vi.mocked(obtenerRoom).mockResolvedValue("room-456");
            mockSocket.data = { idRepartidor: 1, idRuta: 100 };

            await eventHandlers["driver:location"]({
                lat: 10.5,
                lng: 20.5,
                eta: 300,
            });

            expect(trackingStore.agregarPosicion).toHaveBeenCalledWith(1, {
                lat: 10.5,
                lng: 20.5,
                timestamp: expect.any(Number),
            });
            expect(obtenerRoom).toHaveBeenCalledWith(100);
        });

        it("emite milestone cuando eta <= 120", async () => {
            vi.mocked(obtenerRoom).mockResolvedValue("room-456");
            mockSocket.data = { idRepartidor: 1, idRuta: 100 };
            const mockToEmit = vi.fn();
            vi.mocked(mockIo.to).mockReturnValue({ emit: mockToEmit } as any);

            await eventHandlers["driver:location"]({
                lat: 10.5,
                lng: 20.5,
                eta: 60,
            });

            expect(mockToEmit).toHaveBeenCalledWith("order:milestone", { hito: "2min" });
        });

        it("emite milestone cuando eta <= 600", async () => {
            vi.mocked(obtenerRoom).mockResolvedValue("room-456");
            mockSocket.data = { idRepartidor: 1, idRuta: 100 };
            const mockToEmit = vi.fn();
            vi.mocked(mockIo.to).mockReturnValue({ emit: mockToEmit } as any);

            await eventHandlers["driver:location"]({
                lat: 10.5,
                lng: 20.5,
                eta: 300,
            });

            expect(mockToEmit).toHaveBeenCalledWith("order:milestone", { hito: "10min" });
        });
    });

    describe("client:join", () => {
        it("une cliente a room y emite última posición si existe", async () => {
            vi.mocked(obtenerRoom).mockResolvedValue("room-789");
            const lastPosition = { lat: 10, lng: 20, timestamp: 123 };
            vi.mocked(trackingStore.obtenerUltimaPosicion).mockReturnValue(lastPosition as any);

            await eventHandlers["client:join"]({
                idRepartidor: "1",
                puntos: "P1,P2",
            });

            expect(obtenerRoom).toHaveBeenCalledWith("1");
            expect(mockSocket.join).toHaveBeenCalledWith("room-789");
            expect(mockSocket.data).toEqual({
                idRepartidor: "1",
                puntos: "P1,P2",
            });
            expect(mockSocket.emit).toHaveBeenCalledWith("location:update", lastPosition);
        });

        it("no emite location:update si no hay última posición", async () => {
            vi.mocked(obtenerRoom).mockResolvedValue("room-789");
            vi.mocked(trackingStore.obtenerUltimaPosicion).mockReturnValue(null);

            await eventHandlers["client:join"]({
                idRepartidor: "1",
                puntos: "P1,P2",
            });

            expect(mockSocket.emit).not.toHaveBeenCalledWith(
                expect.objectContaining({ 0: "location:update" }),
                expect.anything()
            );
        });

        it("emite error si obtenerRoom falla", async () => {
            vi.mocked(obtenerRoom).mockRejectedValue(new Error("error room"));

            await eventHandlers["client:join"]({
                idRepartidor: "1",
                puntos: "P1",
            });

            expect(mockSocket.emit).toHaveBeenCalledWith("error", {
                mensaje: "Error al unirse a la ruta",
            });
        });
    });

    describe("driver:finish", () => {
        it("elimina session, emite driver:finished y broadcast a room", async () => {
            vi.mocked(obtenerRoom).mockResolvedValue("room-finish");
            mockSocket.data = { idRepartidor: 1 };
            const mockToEmit = vi.fn();
            vi.mocked(mockIo.to).mockReturnValue({ emit: mockToEmit } as any);

            await eventHandlers["driver:finish"]({
                idRuta: 100,
            });

            expect(obtenerRoom).toHaveBeenCalledWith(100);
            expect(trackingStore.eliminarSession).toHaveBeenCalledWith(1);
            expect(mockToEmit).toHaveBeenCalledWith("driver:finished");
        });

        it("emite error si obtenerRoom falla", async () => {
            vi.mocked(obtenerRoom).mockRejectedValue(new Error("error room"));
            mockSocket.data = { idRepartidor: 1 };

            await eventHandlers["driver:finish"]({
                idRuta: 100,
            });

            expect(mockSocket.emit).toHaveBeenCalledWith("error", {
                mensaje: "Error al finalizar tracking",
            });
        });
    });

    describe("disconnect", () => {
        it("no lanza error si hay idRepartidor", () => {
            mockSocket.data = { idRepartidor: 1 };

            expect(() => {
                eventHandlers["disconnect"]();
            }).not.toThrow();
        });

        it("no lanza error si no hay idRepartidor", () => {
            mockSocket.data = {};

            expect(() => {
                eventHandlers["disconnect"]();
            }).not.toThrow();
        });
    });
});

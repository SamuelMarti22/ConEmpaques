import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { trackingStore } from "../../src/store/storeTracking.service";

describe("trackingStore", () => {
    beforeEach(() => {});

    describe("crearSession", () => {
        it("crea una nueva sesión con datos iniciales", () => {
            trackingStore.crearSession(1, ["P1", "P2", "P3"], 100);

            const session = trackingStore.obtenerSession(100);
            expect(session).toBeDefined();
            expect(session?.idRepartidor).toBe(1);
            expect(session?.puntos).toEqual(["P1", "P2", "P3"]);
            expect(session?.posiciones).toEqual([]);
        });

        it("sobrescribe la sesión si ya existe", () => {
            trackingStore.crearSession(1, ["P1"], 100);
            trackingStore.crearSession(2, ["P2", "P3"], 100);

            const session = trackingStore.obtenerSession(100);
            expect(session?.idRepartidor).toBe(2);
            expect(session?.puntos).toEqual(["P2", "P3"]);
        });

        it("convierte numeros a string para las keys", () => {
            trackingStore.crearSession(1, ["P1"], 100);
            trackingStore.crearSession(2, ["P2"], 100);

            const session = trackingStore.obtenerSession(100);
            expect(session?.idRepartidor).toBe(2); // Debería ser la última (con string key)
        });
    });

    describe("obtenerUltimaPosicion", () => {
        it("retorna null si no existe sesión", () => {
            const position = trackingStore.obtenerUltimaPosicion(999);
            expect(position).toBeNull();
        });

        it("retorna null si la sesión no tiene posiciones", () => {
            trackingStore.crearSession(1, ["P1"], 100);
            const position = trackingStore.obtenerUltimaPosicion(100);
            expect(position).toBeNull();
        });

        it("retorna la primera posición (más reciente)", () => {
            trackingStore.crearSession(1, ["P1"], 100);
            trackingStore.agregarPosicion("100", { lat: 10, lng: 20, timestamp: 1000 });
            trackingStore.agregarPosicion("100", { lat: 11, lng: 21, timestamp: 2000 });

            const position = trackingStore.obtenerUltimaPosicion(100);
            expect(position).toEqual({ lat: 11, lng: 21, timestamp: 2000 });
        });
    });

    describe("obtenerSession", () => {
        it("retorna null si no existe sesión", () => {
            const session = trackingStore.obtenerSession(999);
            expect(session).toBeNull();
        });

        it("retorna la sesión completa si existe", () => {
            trackingStore.crearSession(1, ["P1", "P2"], 100);

            const session = trackingStore.obtenerSession(100);
            expect(session).toBeDefined();
            expect(session?.idRepartidor).toBe(1);
            expect(session?.puntos).toEqual(["P1", "P2"]);
        });

        it("maneja tanto números como strings como key", () => {
            trackingStore.crearSession(1, ["P1"], 100);

            const session1 = trackingStore.obtenerSession(100);
            const session2 = trackingStore.obtenerSession("100");

            expect(session1).toEqual(session2);
        });
    });

    describe("eliminarSession", () => {
        it("elimina la sesión correctamente", () => {
            trackingStore.crearSession(1, ["P1"], 100);
            expect(trackingStore.obtenerSession(100)).toBeDefined();

            trackingStore.eliminarSession(100);
            expect(trackingStore.obtenerSession(100)).toBeNull();
        });

        it("no lanza error si la sesión no existe", () => {
            expect(() => {
                trackingStore.eliminarSession(999);
            }).not.toThrow();
        });

        it("maneja tanto números como strings como key", () => {
            trackingStore.crearSession(1, ["P1"], 100);

            trackingStore.eliminarSession("100");
            expect(trackingStore.obtenerSession(100)).toBeNull();
        });
    });

    describe("agregarPosicion", () => {
        it("agrega una nueva posición a la sesión", () => {
            trackingStore.crearSession(1, ["P1"], 100);
            const position = { lat: 10, lng: 20, timestamp: 1000 };

            trackingStore.agregarPosicion("100", position);

            const session = trackingStore.obtenerSession(100);
            expect(session?.posiciones).toContainEqual(position);
        });

        it("no agrega posición si la sesión no existe", () => {
            trackingStore.agregarPosicion("999", { lat: 10, lng: 20, timestamp: 1000 });

            const session = trackingStore.obtenerSession(999);
            expect(session).toBeNull();
        });

        it("mantiene máximo 3 posiciones ordenadas por más reciente primero", () => {
            trackingStore.crearSession(1, ["P1"], 100);

            trackingStore.agregarPosicion("100", { lat: 10, lng: 20, timestamp: 1000 });
            trackingStore.agregarPosicion("100", { lat: 11, lng: 21, timestamp: 2000 });
            trackingStore.agregarPosicion("100", { lat: 12, lng: 22, timestamp: 3000 });
            trackingStore.agregarPosicion("100", { lat: 13, lng: 23, timestamp: 4000 });

            const session = trackingStore.obtenerSession(100);
            expect(session?.posiciones.length).toBe(3);
            expect(session?.posiciones[0]).toEqual({ lat: 13, lng: 23, timestamp: 4000 });
            expect(session?.posiciones[1]).toEqual({ lat: 12, lng: 22, timestamp: 3000 });
            expect(session?.posiciones[2]).toEqual({ lat: 11, lng: 21, timestamp: 2000 });
        });

        it("descarta la posición más antigua cuando se excede el límite", () => {
            trackingStore.crearSession(1, ["P1"], 100);

            trackingStore.agregarPosicion("100", { lat: 10, lng: 20, timestamp: 1000 });
            trackingStore.agregarPosicion("100", { lat: 11, lng: 21, timestamp: 2000 });
            trackingStore.agregarPosicion("100", { lat: 12, lng: 22, timestamp: 3000 });
            trackingStore.agregarPosicion("100", { lat: 13, lng: 23, timestamp: 4000 });

            const session = trackingStore.obtenerSession(100);
            expect(session?.posiciones).not.toContainEqual({ lat: 10, lng: 20, timestamp: 1000 });
        });
    });
});

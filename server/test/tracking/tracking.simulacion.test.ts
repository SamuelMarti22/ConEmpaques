import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const agregarPosicionMock = vi.fn();

vi.mock("../../src/store/storeTracking.service.js", () => ({
	trackingStore: {
		agregarPosicion: agregarPosicionMock,
	},
}));

async function cargarServicio() {
	vi.resetModules();
	const modulo = await import("../../src/modules/tracking/tracking.simulation.service");
	return modulo.trackingSimulationService;
}

describe("trackingSimulationService", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
		agregarPosicionMock.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("lanza error si no hay coordenadas", async () => {
		const service = await cargarServicio();
		const ioMock = { to: vi.fn(() => ({ emit: vi.fn() })) } as any;

		expect(() =>
			service.iniciarSimulacion({
				io: ioMock,
				rutaId: 10,
				idRepartidor: 1,
				room: "room-10",
				coordenadas: [],
				intervaloMs: 2000,
			})
		).toThrow("No hay coordenadas para simular la ruta");
	});

	it("inicia simulación, emite posición inmediata y guarda estado activo", async () => {
		const service = await cargarServicio();
		const emitMock = vi.fn();
		const ioMock = {
			to: vi.fn(() => ({ emit: emitMock })),
		} as any;

		const estado = service.iniciarSimulacion({
			io: ioMock,
			rutaId: 20,
			idRepartidor: 3,
			room: "room-20",
			coordenadas: [
				{ lat: 4.6, lng: -74.1 },
				{ lat: 4.61, lng: -74.11 },
			],
			intervaloMs: 5000,
		});

		expect(agregarPosicionMock).toHaveBeenCalledWith(20, {
			lat: 4.6,
			lng: -74.1,
			timestamp: Date.now(),
			simulado: true,
		});
		expect(ioMock.to).toHaveBeenCalledWith("room-20");
		expect(emitMock).toHaveBeenCalledWith("location:update", {
			lat: 4.6,
			lng: -74.1,
			eta: 5,
			timestamp: Date.now(),
			idRuta: 20,
			idRepartidor: 3,
			simulado: true,
		});

		expect(estado).toEqual({
			rutaId: 20,
			idRepartidor: 3,
			room: "room-20",
			indiceActual: 1,
			totalPuntos: 2,
			intervaloMs: 5000,
			activoDesde: Date.now(),
			activo: true,
		});
	});

	it("avanza posiciones por intervalo y reinicia índice al llegar al final", async () => {
		const service = await cargarServicio();
		const emitMock = vi.fn();
		const ioMock = {
			to: vi.fn(() => ({ emit: emitMock })),
		} as any;

		service.iniciarSimulacion({
			io: ioMock,
			rutaId: 30,
			idRepartidor: 4,
			room: "room-30",
			coordenadas: [
				{ lat: 1, lng: 1 },
				{ lat: 2, lng: 2 },
			],
			intervaloMs: 1000,
		});

		vi.advanceTimersByTime(1000);
		vi.advanceTimersByTime(1000);

		expect(agregarPosicionMock).toHaveBeenNthCalledWith(1, 30, expect.objectContaining({ lat: 1, lng: 1 }));
		expect(agregarPosicionMock).toHaveBeenNthCalledWith(2, 30, expect.objectContaining({ lat: 2, lng: 2 }));
		expect(agregarPosicionMock).toHaveBeenNthCalledWith(3, 30, expect.objectContaining({ lat: 1, lng: 1 }));

		const estado = service.obtenerEstado(30);
		expect(estado).toEqual(expect.objectContaining({
			rutaId: 30,
			indiceActual: 1,
			activo: true,
		}));

		const ultimaEmision = emitMock.mock.calls[emitMock.mock.calls.length - 1]?.[1];
		expect(ultimaEmision).toEqual(expect.objectContaining({
			lat: 1,
			lng: 1,
			eta: 1,
			idRuta: 30,
			idRepartidor: 4,
			simulado: true,
		}));
	});

	it("detiene simulación y deja de emitir eventos", async () => {
		const service = await cargarServicio();
		const emitMock = vi.fn();
		const ioMock = {
			to: vi.fn(() => ({ emit: emitMock })),
		} as any;

		service.iniciarSimulacion({
			io: ioMock,
			rutaId: 40,
			idRepartidor: 5,
			room: "room-40",
			coordenadas: [
				{ lat: 10, lng: 10 },
				{ lat: 11, lng: 11 },
			],
			intervaloMs: 1000,
		});

		const estadoAnterior = service.detenerSimulacion(40);
		const llamadasAntes = emitMock.mock.calls.length;
		vi.advanceTimersByTime(5000);

		expect(estadoAnterior).toEqual(expect.objectContaining({
			rutaId: 40,
			idRepartidor: 5,
		}));
		expect(service.obtenerEstado(40)).toBeNull();
		expect(emitMock).toHaveBeenCalledTimes(llamadasAntes);
	});

	it("detenerSimulacion retorna null cuando no existe simulación", async () => {
		const service = await cargarServicio();

		expect(service.detenerSimulacion(999)).toBeNull();
		expect(service.obtenerEstado(999)).toBeNull();
	});

	it("reiniciar una simulación en la misma ruta reemplaza el intervalo anterior", async () => {
		const service = await cargarServicio();
		const emitMock = vi.fn();
		const ioMock = {
			to: vi.fn(() => ({ emit: emitMock })),
		} as any;

		service.iniciarSimulacion({
			io: ioMock,
			rutaId: 50,
			idRepartidor: 8,
			room: "room-50",
			coordenadas: [{ lat: 1, lng: 1 }],
			intervaloMs: 1000,
		});

		service.iniciarSimulacion({
			io: ioMock,
			rutaId: 50,
			idRepartidor: 8,
			room: "room-50",
			coordenadas: [{ lat: 9, lng: 9 }],
			intervaloMs: 2000,
		});

		vi.advanceTimersByTime(2000);

		const llamadasLat9 = agregarPosicionMock.mock.calls.filter(
			(call) => call[1]?.lat === 9
		);
		expect(llamadasLat9.length).toBe(2);
		expect(service.obtenerEstado(50)).toEqual(
			expect.objectContaining({
				intervaloMs: 2000,
				totalPuntos: 1,
				activo: true,
			})
		);
	});
});

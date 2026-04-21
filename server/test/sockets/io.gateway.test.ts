import type { Server } from "socket.io";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cargarGateway = async () => {
	vi.resetModules();
	return await import("../../src/sockets/io.gateway");
};

describe("io.gateway", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("getSocketServer retorna null inicialmente", async () => {
		const { getSocketServer } = await cargarGateway();

		expect(getSocketServer()).toBeNull();
	});

	it("setSocketServer guarda la instancia de io", async () => {
		const { setSocketServer, getSocketServer } = await cargarGateway();
		const ioMock = { to: vi.fn() } as unknown as Server;

		setSocketServer(ioMock);

		expect(getSocketServer()).toBe(ioMock);
	});

	it("setSocketServer reemplaza la instancia anterior", async () => {
		const { setSocketServer, getSocketServer } = await cargarGateway();
		const ioA = { to: vi.fn() } as unknown as Server;
		const ioB = { to: vi.fn() } as unknown as Server;

		setSocketServer(ioA);
		setSocketServer(ioB);

		expect(getSocketServer()).toBe(ioB);
		expect(getSocketServer()).not.toBe(ioA);
	});
});

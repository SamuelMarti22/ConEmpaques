import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { EstadoRuta } from "../../src/databases/prisma/generated/prisma/enums.js";
import * as roomsService from "../../src/sockets/rooms.service";

vi.mock("../../src/databases/prisma/lib/prisma.js", () => ({
    prisma: {
        ruta: {
            findUnique: vi.fn(),
        }
    }
}));

describe("entrarARoom", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("une el socket a la room si el socket existe", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        const mockSocket = { join: vi.fn() };
        const mockIo = {
            sockets: {
                sockets: new Map([["socket-1", mockSocket]])
            }
        };
        vi.mocked(prisma.ruta.findUnique).mockResolvedValue({ room: "room-abc" } as any);

        await roomsService.entrarARoom(mockIo as any, "socket-1", 123);
        expect(prisma.ruta.findUnique).toHaveBeenCalledWith({
            where: { id: 123 },
            select: { room: true }
        });
        expect(mockSocket.join).toHaveBeenCalledWith("room-abc");
    });

    it("no hace nada si el socket no existe", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        const mockIo = {
            sockets: {
                sockets: new Map() // vacío
            }
        };

        await roomsService.entrarARoom(mockIo as any, "socket-2", 123);
        expect(prisma.ruta.findUnique).not.toHaveBeenCalled();
    });

    it("propaga el error si obtenerRoom falla", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        const mockSocket = { join: vi.fn() };
        const mockIo = {
            sockets: {
                sockets: new Map([["socket-3", mockSocket]])
            }
        };
        vi.mocked(prisma.ruta.findUnique).mockRejectedValue(new Error("error room"));

        await expect(roomsService.entrarARoom(mockIo as any, "socket-3", 999)).rejects.toThrow("error room");
        expect(mockSocket.join).not.toHaveBeenCalled();
    });
});

describe("obtenerRoom", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("retorna el room si la ruta existe y tiene room válido", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        vi.mocked(prisma.ruta.findUnique).mockResolvedValue({ room: "room-xyz" } as any);

        const result = await roomsService.obtenerRoom(456);
        
        expect(prisma.ruta.findUnique).toHaveBeenCalledWith({
            where: { id: 456 },
            select: { room: true }
        });
        expect(result).toBe("room-xyz");
    });

    it("lanza error si la ruta no existe", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        vi.mocked(prisma.ruta.findUnique).mockResolvedValue(null);

        await expect(roomsService.obtenerRoom(999)).rejects.toThrow(
            "No se encontró la room para la ruta con ID: 999"
        );
    });

    it("lanza error si la ruta existe pero no tiene room", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        vi.mocked(prisma.ruta.findUnique).mockResolvedValue({ room: null } as any);

        await expect(roomsService.obtenerRoom(789)).rejects.toThrow(
            "No se encontró la room para la ruta con ID: 789"
        );
    });

    it("propaga el error si prisma.ruta.findUnique falla", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        vi.mocked(prisma.ruta.findUnique).mockRejectedValue(new Error("error de BD"));

        await expect(roomsService.obtenerRoom(111)).rejects.toThrow("error de BD");
    });
});

describe("abandonarRoom", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("abandona el socket de la room si el socket existe", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        const mockSocket = { leave: vi.fn() };
        const mockIo = {
            sockets: {
                sockets: new Map([["socket-1", mockSocket]])
            }
        };
        vi.mocked(prisma.ruta.findUnique).mockResolvedValue({ room: "room-abc" } as any);

        await roomsService.abandonarRoom(mockIo as any, "socket-1", 123);
        expect(prisma.ruta.findUnique).toHaveBeenCalledWith({
            where: { id: 123 },
            select: { room: true }
        });
        expect(mockSocket.leave).toHaveBeenCalledWith("room-abc");
    });

    it("no hace nada si el socket no existe", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        const mockIo = {
            sockets: {
                sockets: new Map() // vacío
            }
        };

        await roomsService.abandonarRoom(mockIo as any, "socket-2", 123);
        expect(prisma.ruta.findUnique).not.toHaveBeenCalled();
    });

    it("propaga el error si obtenerRoom falla", async () => {
        const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");
        const mockSocket = { leave: vi.fn() };
        const mockIo = {
            sockets: {
                sockets: new Map([["socket-3", mockSocket]])
            }
        };
        vi.mocked(prisma.ruta.findUnique).mockRejectedValue(new Error("error room"));

        await expect(roomsService.abandonarRoom(mockIo as any, "socket-3", 999)).rejects.toThrow("error room");
        expect(mockSocket.leave).not.toHaveBeenCalled();
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    authService,
    CredencialesInvalidasError,
    UsuarioNoEncontradoError,
} from "../../src/modules/autenticacion/auth.service";

vi.mock("../../src/databases/prisma/lib/prisma.js", () => ({
    prisma: {
        usuario: {
            findFirst: vi.fn(),
        },
        $queryRaw: vi.fn(),
    },
}));

const { prisma } = await import("../../src/databases/prisma/lib/prisma.js");

describe("authService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loginLogistico", () => {
        it("retorna datos de usuario cuando login es exitoso", async () => {
            vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
                id: 1,
                nombre: "Admin",
                email: "admin@logistica.com",
                password: "password123",
                rol: "ADMIN",
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const resultado = await authService.loginLogistico(
                "admin@logistica.com",
                "password123"
            );

            expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
                where: {
                    email: "admin@logistica.com",
                    rol: "ADMIN",
                },
            });
            expect(resultado.mensaje).toBe("Autenticación exitosa");
            expect(resultado.usuario).toEqual({
                id: 1,
                nombre: "Admin",
                email: "admin@logistica.com",
                rol: "ADMIN",
            });
        });

        it("lanza UsuarioNoEncontradoError cuando usuario no existe", async () => {
            vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null);

            await expect(
                authService.loginLogistico("noexiste@logistica.com", "password123")
            ).rejects.toThrow(UsuarioNoEncontradoError);
            await expect(
                authService.loginLogistico("noexiste@logistica.com", "password123")
            ).rejects.toThrow("Usuario logístico no encontrado");
        });

        it("lanza CredencialesInvalidasError cuando password es incorrecto", async () => {
            vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
                id: 1,
                nombre: "Admin",
                email: "admin@logistica.com",
                password: "password123",
                rol: "ADMIN",
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            await expect(
                authService.loginLogistico("admin@logistica.com", "wrongpassword")
            ).rejects.toThrow(CredencialesInvalidasError);
        });

        it("busca usuario con rol ADMIN específico", async () => {
            vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null);

            try {
                await authService.loginLogistico("admin@logistica.com", "password123");
            } catch (error) {
                // esperamos que falle
            }

            expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
                where: {
                    email: "admin@logistica.com",
                    rol: "ADMIN",
                },
            });
        });
    });

    describe("loginRepartidor", () => {
        it("retorna datos de usuario cuando login es exitoso", async () => {
            vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
                id: 2,
                nombre: "Repartidor",
                email: "repartidor@empresa.com",
                password: "password456",
                rol: "REPARTIDOR",
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const resultado = await authService.loginRepartidor(
                "repartidor@empresa.com",
                "password456"
            );

            expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
                where: {
                    email: "repartidor@empresa.com",
                    rol: "REPARTIDOR",
                },
            });
            expect(resultado.mensaje).toBe("Autenticación exitosa");
            expect(resultado.repartidor).toEqual({
                id: 2,
                nombre: "Repartidor",
                email: "repartidor@empresa.com",
                rol: "REPARTIDOR",
            });
        });

        it("lanza UsuarioNoEncontradoError cuando usuario no existe", async () => {
            vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null);

            await expect(
                authService.loginRepartidor("noexiste@empresa.com", "password456")
            ).rejects.toThrow(UsuarioNoEncontradoError);
            await expect(
                authService.loginRepartidor("noexiste@empresa.com", "password456")
            ).rejects.toThrow("Repartidor no encontrado");
        });

        it("busca usuario con rol REPARTIDOR específico", async () => {
            vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null);

            try {
                await authService.loginRepartidor("repartidor@empresa.com", "password456");
            } catch (error) {
                // esperamos que falle
            }

            expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
                where: {
                    email: "repartidor@empresa.com",
                    rol: "REPARTIDOR",
                },
            });
        });
    });

    describe("loginCliente", () => {
        it("retorna datos de cliente cuando código existe", async () => {
            const queryRawMock = vi.mocked(prisma.$queryRaw);
            queryRawMock.mockResolvedValue([
                {
                    rutaId: 100,
                    codigo: "PEDIDO-123",
                    estado: "EN_TRANSITO",
                },
            ] as any);

            const resultado = await authService.loginCliente("PEDIDO-123");

            expect(resultado.mensaje).toBe("Autenticación exitosa");
            expect(resultado.cliente).toEqual({
                codigo: "PEDIDO-123",
                rutaId: 100,
                estado: "EN_TRANSITO",
            });
        });

        it("lanza UsuarioNoEncontradoError cuando código no existe", async () => {
            const queryRawMock = vi.mocked(prisma.$queryRaw);
            queryRawMock.mockResolvedValue([]);

            await expect(authService.loginCliente("CODIGO-INVALIDO")).rejects.toThrow(
                UsuarioNoEncontradoError
            );
            await expect(authService.loginCliente("CODIGO-INVALIDO")).rejects.toThrow(
                "Código de pedido no encontrado"
            );
        });

        it("ejecuta consulta SQL con el código correcto", async () => {
            const queryRawMock = vi.mocked(prisma.$queryRaw);
            queryRawMock.mockResolvedValue([
                {
                    rutaId: 100,
                    codigo: "PEDIDO-123",
                    estado: "EN_TRANSITO",
                },
            ] as any);

            await authService.loginCliente("PEDIDO-123");

            expect(queryRawMock).toHaveBeenCalled();
        });

        it("lanza error cuando resultado de query es null", async () => {
            const queryRawMock = vi.mocked(prisma.$queryRaw);
            queryRawMock.mockResolvedValue(null);

            await expect(authService.loginCliente("PEDIDO-123")).rejects.toThrow(
                UsuarioNoEncontradoError
            );
        });

        it("maneja respuesta de array vacío correctamente", async () => {
            const queryRawMock = vi.mocked(prisma.$queryRaw);
            queryRawMock.mockResolvedValue([]);

            await expect(authService.loginCliente("PEDIDO-123")).rejects.toThrow(
                "Código de pedido no encontrado"
            );
        });

        it("retorna solo el primer resultado cuando hay múltiples", async () => {
            const queryRawMock = vi.mocked(prisma.$queryRaw);
            queryRawMock.mockResolvedValue([
                {
                    rutaId: 100,
                    codigo: "PEDIDO-123",
                    estado: "EN_TRANSITO",
                },
                {
                    rutaId: 101,
                    codigo: "PEDIDO-124",
                    estado: "ENTREGADO",
                },
            ] as any);

            const resultado = await authService.loginCliente("PEDIDO-123");

            expect(resultado.cliente.rutaId).toBe(100);
            expect(resultado.cliente.codigo).toBe("PEDIDO-123");
        });
    });

    describe("Error classes", () => {
        it("CredencialesInvalidasError usa mensaje personalizado", () => {
            const error = new CredencialesInvalidasError("Contraseña incorrecta");
            expect(error.message).toBe("Contraseña incorrecta");
            expect(error.name).toBe("CredencialesInvalidasError");
        });

        it("CredencialesInvalidasError usa mensaje por defecto", () => {
            const error = new CredencialesInvalidasError();
            expect(error.message).toBe("Credenciales inválidas");
        });

        it("UsuarioNoEncontradoError usa mensaje personalizado", () => {
            const error = new UsuarioNoEncontradoError("Usuario admin no encontrado");
            expect(error.message).toBe("Usuario admin no encontrado");
            expect(error.name).toBe("UsuarioNoEncontradoError");
        });

        it("UsuarioNoEncontradoError usa mensaje por defecto", () => {
            const error = new UsuarioNoEncontradoError();
            expect(error.message).toBe("Usuario no encontrado");
        });
    });
});

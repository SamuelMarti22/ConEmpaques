import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { authController } from "../../src/modules/autenticacion/auth.controller";

vi.mock("../../src/modules/autenticacion/auth.service", () => {
    class CredencialesInvalidasErrorMock extends Error {
        constructor(message: string) {
            super(message);
            this.name = "CredencialesInvalidasError";
        }
    }

    class UsuarioNoEncontradoErrorMock extends Error {
        constructor(message: string) {
            super(message);
            this.name = "UsuarioNoEncontradoError";
        }
    }

    return {
        CredencialesInvalidasError: CredencialesInvalidasErrorMock,
        UsuarioNoEncontradoError: UsuarioNoEncontradoErrorMock,
        authService: {
            loginLogistico: vi.fn(),
            loginRepartidor: vi.fn(),
            loginCliente: vi.fn(),
        },
    };
});

const { authService } = await import("../../src/modules/autenticacion/auth.service");

// Helper para crear respuesta mock
const crearRespuestaMock = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockImplementation((payload) => {
        res.statusCode = (res.status as any).mock.lastCall?.[0];
        res.payload = payload;
        return res;
    });
    return res;
};

describe("authController", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loginLogistico", () => {
        it("retorna 200 cuando login es exitoso", async () => {
            const mockResponse = {
                mensaje: "Login exitoso",
                usuario: {
                    id: 1,
                    nombre: "Admin",
                    email: "admin@logistica.com",
                    rol: "ADMIN",
                },
            };
            vi.mocked(authService.loginLogistico).mockResolvedValue(mockResponse);

            const req = {
                body: { email: "admin@logistica.com", password: "password123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginLogistico(req, res);

            expect(authService.loginLogistico).toHaveBeenCalledWith("admin@logistica.com", "password123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResponse);
        });

        it("retorna 400 cuando falta email", async () => {
            const req = {
                body: { password: "password123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginLogistico(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Email y password son requeridos",
            });
        });

        it("retorna 400 cuando falta password", async () => {
            const req = {
                body: { email: "admin@logistica.com" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginLogistico(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Email y password son requeridos",
            });
        });

        it("retorna 401 cuando credenciales son inválidas", async () => {
            const { CredencialesInvalidasError } = await import("../../src/modules/autenticacion/auth.service");
            vi.mocked(authService.loginLogistico).mockRejectedValue(
                new CredencialesInvalidasError("Credenciales inválidas")
            );

            const req = {
                body: { email: "admin@logistica.com", password: "wrongpassword" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginLogistico(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: "Credenciales inválidas",
            });
        });

        it("retorna 404 cuando usuario no existe", async () => {
            const { UsuarioNoEncontradoError } = await import("../../src/modules/autenticacion/auth.service");
            vi.mocked(authService.loginLogistico).mockRejectedValue(
                new UsuarioNoEncontradoError("Usuario no encontrado")
            );

            const req = {
                body: { email: "noexiste@logistica.com", password: "password123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginLogistico(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Usuario no encontrado",
            });
        });

        it("retorna 500 cuando ocurre error genérico", async () => {
            vi.mocked(authService.loginLogistico).mockRejectedValue(new Error("Error de base de datos"));

            const req = {
                body: { email: "admin@logistica.com", password: "password123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginLogistico(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Error interno del servidor",
                detalle: "Error de base de datos",
            });
        });
    });

    describe("loginRepartidor", () => {
        it("retorna 200 cuando login es exitoso", async () => {
            const mockResponse = {
                mensaje: "Login exitoso",
                usuario: {
                    id: 2,
                    nombre: "Repartidor",
                    email: "repartidor@empresa.com",
                    rol: "REPARTIDOR",
                },
            };
            vi.mocked(authService.loginRepartidor).mockResolvedValue(mockResponse);

            const req = {
                body: { email: "repartidor@empresa.com", password: "password123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginRepartidor(req, res);

            expect(authService.loginRepartidor).toHaveBeenCalledWith("repartidor@empresa.com", "password123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResponse);
        });

        it("retorna 400 cuando falta email", async () => {
            const req = {
                body: { password: "password123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginRepartidor(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Email y password son requeridos",
            });
        });

        it("retorna 400 cuando falta password", async () => {
            const req = {
                body: { email: "repartidor@empresa.com" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginRepartidor(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Email y password son requeridos",
            });
        });

        it("retorna 401 cuando credenciales son inválidas", async () => {
            const { CredencialesInvalidasError } = await import("../../src/modules/autenticacion/auth.service");
            vi.mocked(authService.loginRepartidor).mockRejectedValue(
                new CredencialesInvalidasError("Credenciales inválidas")
            );

            const req = {
                body: { email: "repartidor@empresa.com", password: "wrongpassword" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginRepartidor(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it("retorna 404 cuando usuario no existe", async () => {
            const { UsuarioNoEncontradoError } = await import("../../src/modules/autenticacion/auth.service");
            vi.mocked(authService.loginRepartidor).mockRejectedValue(
                new UsuarioNoEncontradoError("Usuario no encontrado")
            );

            const req = {
                body: { email: "noexiste@empresa.com", password: "password123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginRepartidor(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("retorna 500 cuando ocurre error genérico", async () => {
            vi.mocked(authService.loginRepartidor).mockRejectedValue(new Error("Error de base de datos"));

            const req = {
                body: { email: "repartidor@empresa.com", password: "password123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginRepartidor(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("loginCliente", () => {
        it("retorna 200 cuando login es exitoso", async () => {
            const mockResponse = {
                mensaje: "Login exitoso",
                cliente: {
                    codigo: "PEDIDO-123",
                    rutaId: 100,
                    estado: "EN_TRANSITO",
                },
            };
            vi.mocked(authService.loginCliente).mockResolvedValue(mockResponse);

            const req = {
                body: { codigo: "PEDIDO-123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginCliente(req, res);

            expect(authService.loginCliente).toHaveBeenCalledWith("PEDIDO-123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResponse);
        });

        it("retorna 400 cuando falta código", async () => {
            const req = {
                body: {},
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginCliente(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Código de pedido es requerido",
            });
        });

        it("retorna 404 cuando pedido no existe", async () => {
            const { UsuarioNoEncontradoError } = await import("../../src/modules/autenticacion/auth.service");
            vi.mocked(authService.loginCliente).mockRejectedValue(
                new UsuarioNoEncontradoError("Pedido no encontrado")
            );

            const req = {
                body: { codigo: "PEDIDO-999" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginCliente(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Pedido no encontrado",
            });
        });

        it("retorna 500 cuando ocurre error genérico", async () => {
            vi.mocked(authService.loginCliente).mockRejectedValue(new Error("Error de base de datos"));

            const req = {
                body: { codigo: "PEDIDO-123" },
            } as Request;
            const res = crearRespuestaMock();

            await authController.loginCliente(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Error interno del servidor",
                detalle: "Error de base de datos",
            });
        });
    });
});

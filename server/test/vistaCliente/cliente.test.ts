import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";
import { clienteController } from "../../src/modules/vistaCliente/cliente.controller";
import { RutaEntregaModel } from "../../src/databases/mongoDB/models/rutaEntrega.model";

// Mock de RutaEntregaModel
vi.mock("../../src/databases/mongoDB/models/rutaEntrega.model");

describe("clienteController", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockJsonResponse: any;

    const mockFindOne = (result: any) => ({
        lean: vi.fn().mockResolvedValue(result),
    });

    beforeEach(() => {
        mockJsonResponse = vi.fn().mockReturnValue({});
        mockResponse = {
            status: vi.fn().mockReturnValue({
                json: mockJsonResponse,
            }),
        };
        vi.clearAllMocks();
    });

    describe("getPuntoEntrega", () => {
        it("retorna 400 si no se proporciona el codigo del pedido", async () => {
            mockRequest = { params: {} };

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockJsonResponse).toHaveBeenCalledWith({
                error: "Debes enviar el codigo del pedido en el parametro id",
            });
        });

        it("retorna 400 si el codigo del pedido está vacío", async () => {
            mockRequest = { params: { id: "   " } };

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockJsonResponse).toHaveBeenCalledWith({
                error: "Debes enviar el codigo del pedido en el parametro id",
            });
        });

        it("retorna 404 si no encuentra el punto de entrega", async () => {
            mockRequest = { params: { id: "P1" } };
            vi.mocked(RutaEntregaModel.findOne).mockReturnValue(mockFindOne(null) as any);

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockJsonResponse).toHaveBeenCalledWith({
                error: "No se encontro un punto de entrega con el codigo indicado",
            });
        });

        it("retorna 404 si la ruta no tiene puntos de entrega coincidentes", async () => {
            mockRequest = { params: { id: "P1" } };
            vi.mocked(RutaEntregaModel.findOne).mockReturnValue(
                mockFindOne({ rutaId: 1, puntosEntrega: [] }) as any
            );

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockJsonResponse).toHaveBeenCalledWith({
                error: "No se encontro un punto de entrega con el codigo indicado",
            });
        });

        it("retorna 200 con el punto de entrega cuando se encuentra", async () => {
            const codigoPedido = "P123";
            const puntoEntrega = {
                codigo: codigoPedido,
                direccion: "Calle 123",
                latitud: 10.5,
                longitud: 20.5,
            };
            const rutaData = {
                rutaId: 1,
                puntosEntrega: [puntoEntrega],
            };

            mockRequest = { params: { id: codigoPedido } };
            vi.mocked(RutaEntregaModel.findOne).mockReturnValue(mockFindOne(rutaData) as any);

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockJsonResponse).toHaveBeenCalledWith({
                rutaId: 1,
                puntoEntrega,
            });
        });

        it("retorna 500 cuando ocurre un error en la base de datos", async () => {
            mockRequest = { params: { id: "P1" } };
            const error = new Error("Database connection error");
            vi.mocked(RutaEntregaModel.findOne).mockReturnValue({
                lean: vi.fn().mockRejectedValue(error),
            } as any);

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockJsonResponse).toHaveBeenCalledWith({
                error: "Error al obtener el punto de entrega",
            });
        });

        it("realiza la consulta con los parametros correctos", async () => {
            const codigoPedido = "P456";
            mockRequest = { params: { id: codigoPedido } };
            vi.mocked(RutaEntregaModel.findOne).mockReturnValue(mockFindOne(null) as any);

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(RutaEntregaModel.findOne).toHaveBeenCalledWith(
                { "puntosEntrega.codigo": codigoPedido },
                { puntosEntrega: { $elemMatch: { codigo: codigoPedido } }, rutaId: 1 }
            );
        });

        it("elimina espacios en blanco del codigo del pedido", async () => {
            const codigoPedido = "P789";
            mockRequest = { params: { id: `  ${codigoPedido}  ` } };
            vi.mocked(RutaEntregaModel.findOne).mockReturnValue(mockFindOne(null) as any);

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(RutaEntregaModel.findOne).toHaveBeenCalledWith(
                { "puntosEntrega.codigo": codigoPedido },
                { puntosEntrega: { $elemMatch: { codigo: codigoPedido } }, rutaId: 1 }
            );
        });

        it("maneja multiples puntos de entrega retornando solo el primero", async () => {
            const codigoPedido = "P999";
            const puntoEntrega1 = {
                codigo: codigoPedido,
                direccion: "Calle 1",
                latitud: 10.5,
                longitud: 20.5,
            };
            const puntoEntrega2 = {
                codigo: codigoPedido,
                direccion: "Calle 2",
                latitud: 11.5,
                longitud: 21.5,
            };
            const rutaData = {
                rutaId: 1,
                puntosEntrega: [puntoEntrega1, puntoEntrega2],
            };

            mockRequest = { params: { id: codigoPedido } };
            vi.mocked(RutaEntregaModel.findOne).mockReturnValue(mockFindOne(rutaData) as any);

            await clienteController.getPuntoEntrega(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockJsonResponse).toHaveBeenCalledWith({
                rutaId: 1,
                puntoEntrega: puntoEntrega1,
            });
        });
    });
});

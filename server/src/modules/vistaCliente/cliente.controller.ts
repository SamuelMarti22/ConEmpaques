import type { Request, Response } from "express";
import { RutaEntregaModel } from "../../databases/mongoDB/models/rutaEntrega.model.js";
import type { IPuntoEntrega } from "../../databases/mongoDB/schema.js";

async function getPuntoEntrega(request: Request, response: Response): Promise<Response> {
    try {
        const codigoPedido = String(request.params.id ?? "").trim();

        if (!codigoPedido) {
            return response.status(400).json({
                error: "Debes enviar el codigo del pedido en el parametro id",
            });
        }

        const rutaConPunto = await RutaEntregaModel.findOne(
            { "puntosEntrega.codigo": codigoPedido },
            { puntosEntrega: { $elemMatch: { codigo: codigoPedido } }, rutaId: 1 }
        ).lean<{ rutaId: number; puntosEntrega: IPuntoEntrega[] } | null>();

        const puntoEntrega = rutaConPunto?.puntosEntrega?.[0];

        if (!puntoEntrega) {
            return response.status(404).json({
                error: "No se encontro un punto de entrega con el codigo indicado",
            });
        }

        return response.status(200).json({
            rutaId: rutaConPunto.rutaId,
            puntoEntrega,
        });
    } catch (error) {
        console.error("Error al obtener el punto de entrega:", error);
        return response.status(500).json({
            error: "Error al obtener el punto de entrega",
        });
    }
}

export const clienteController = {
    getPuntoEntrega,
};
import { Request, Response } from "express";
import { RutaEntregaModel } from "../../databases/mongoDB/models/rutaEntrega.model.js";
import { EstadoRuta } from "../../databases/prisma/generated/prisma/enums.js";
import { obtenerRoom } from "../../sockets/rooms.service";
import { trackingStore } from "../../store/storeTracking.service";
import { rutasService } from "../rutas/rutas.service.js";

export class TrackingController {

    async iniciarTrackingRuta(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);

        // Validar rutaId
        if (!Number.isInteger(rutaId) || rutaId <= 0) {
            res.status(400).json({ error: 'El parámetro rutaId debe ser un entero positivo' });
            return;
        }

        try {
            // Obtener detalles de la ruta para extraer idRepartidor y puntos
            const detalleRuta = await rutasService.consultarDetalleRuta(String(rutaId));

            if (!detalleRuta) {
                res.status(404).json({ error: 'No se encontró la ruta especificada' });
                return;
            }

            const idRepartidor = detalleRuta.repartidor.id;
            const puntos = detalleRuta.detalleParadas.map(p => p.codigoSeguimiento).filter(Boolean);

            trackingStore.crearSession(idRepartidor, puntos as string[], rutaId);
        
            await rutasService.actualizarEstadoRuta(rutaId, EstadoRuta.EN_PROCESO);

            const rutaEntrega = await RutaEntregaModel.findOne({ rutaId });
            if (rutaEntrega) {
                rutaEntrega.puntosEntrega.forEach(punto => {
                    if (punto.estadoEntrega === "EN_BODEGA" || punto.estadoEntrega === "EN_ENTREGA") {
                        punto.estadoEntrega = "PENDIENTE";
                    }
                });

                const primerPuntoPendienteIndex = rutaEntrega.puntosEntrega.findIndex(
                    punto => punto.estadoEntrega === "PENDIENTE"
                );

                if (primerPuntoPendienteIndex >= 0) {
                    rutaEntrega.puntosEntrega.forEach((punto, index) => {
                        if (index === primerPuntoPendienteIndex) {
                            punto.estadoEntrega = "EN_ENTREGA";
                            return;
                        }

                        if (punto.estadoEntrega === "EN_ENTREGA") {
                            punto.estadoEntrega = "PENDIENTE";
                        }
                    });
                }

                await rutaEntrega.save();
                console.log(`✅ ${rutaEntrega.puntosEntrega.length} puntos actualizados al iniciar tracking (primer punto en EN_ENTREGA)`);
            }

            const room = await obtenerRoom(rutaId);
            
            res.status(200).json({
                mensaje: 'Tracking iniciado correctamente',
                data: {
                    rutaId,
                    idRepartidor,
                    room
                }
            });
        }
        catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(500).json({ error: mensajeError });
        }
    }

    async obtenerUbicacionRepartidor(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);

        try {
            // Obtener la última posición registrada
            const ultimaPosicion = trackingStore.obtenerUltimaPosicion(rutaId);

            if (!ultimaPosicion) {
                res.status(404).json({ error: 'No hay ubicación registrada para esta ruta' });
                return;
            }

            res.status(200).json({
                mensaje: 'Ubicación actual',
                data: {
                    lat: ultimaPosicion.lat,
                    lng: ultimaPosicion.lng,
                    timestamp: ultimaPosicion.timestamp,
                    hace: `${(Date.now() - ultimaPosicion.timestamp) / 1000} segundos`
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener ubicación' });
        }
    }
}
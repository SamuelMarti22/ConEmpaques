import { Request, Response } from "express";
import { RutaEntregaModel } from "../../databases/mongoDB/models/rutaEntrega.model.js";
import { EstadoRuta } from "../../databases/prisma/generated/prisma/enums.js";
import { getSocketServer } from "../../sockets/io.gateway.js";
import { obtenerRoom } from "../../sockets/rooms.service";
import { trackingStore } from "../../store/storeTracking.service";
import { rutasService } from "../rutas/rutas.service.js";
import { trackingSimulationService } from "./tracking.simulation.service.js";

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
            res.status(500).json({
                mensaje: 'Error al iniciar tracking de la ruta',
                error: mensajeError
            });
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

    async iniciarSimulacionRuta(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);
        const intervaloBody = Number(req.body?.intervaloMs);
        const intervaloMs = Number.isFinite(intervaloBody) && intervaloBody >= 1000 ? intervaloBody : 5000;

        if (!Number.isInteger(rutaId) || rutaId <= 0) {
            res.status(400).json({ error: 'El parámetro rutaId debe ser un entero positivo' });
            return;
        }

        const io = getSocketServer();
        if (!io) {
            res.status(503).json({ error: 'Socket.io no está disponible en este momento' });
            return;
        }

        try {
            const detalleRuta = await rutasService.consultarDetalleRuta(String(rutaId));
            const idRepartidor = detalleRuta.repartidor.id;
            const puntos = detalleRuta.detalleParadas.map((p) => p.codigoSeguimiento).filter(Boolean);

            const coordenadas = detalleRuta.geometria.geometry.coordinates
                .filter((coord) => Array.isArray(coord) && coord.length >= 2)
                .map((coord) => ({
                    lng: Number(coord[0]),
                    lat: Number(coord[1]),
                }))
                .filter((coord) => Number.isFinite(coord.lat) && Number.isFinite(coord.lng));

            if (coordenadas.length === 0) {
                res.status(400).json({ error: 'La ruta no tiene coordenadas para simular tracking' });
                return;
            }

            const room = await obtenerRoom(rutaId);

            trackingStore.crearSession(idRepartidor, puntos as string[], rutaId);
            await rutasService.actualizarEstadoRuta(rutaId, EstadoRuta.EN_PROCESO);

            const estadoSimulacion = trackingSimulationService.iniciarSimulacion({
                io,
                rutaId,
                idRepartidor,
                room,
                coordenadas,
                intervaloMs,
            });

            const ubicacionInicial = trackingStore.obtenerUltimaPosicion(rutaId);

            res.status(200).json({
                mensaje: 'Simulación de tracking iniciada',
                data: {
                    ...estadoSimulacion,
                    ubicacionInicial,
                },
            });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(500).json({
                mensaje: 'Error al iniciar la simulación de tracking',
                error: mensajeError,
            });
        }
    }

    async detenerSimulacionRuta(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);

        if (!Number.isInteger(rutaId) || rutaId <= 0) {
            res.status(400).json({ error: 'El parámetro rutaId debe ser un entero positivo' });
            return;
        }

        const estado = trackingSimulationService.detenerSimulacion(rutaId);
        trackingStore.eliminarSession(rutaId);

        res.status(200).json({
            mensaje: 'Simulación detenida',
            data: {
                rutaId,
                detenida: true,
                estadoAnterior: estado,
            },
        });
    }

    async estadoSimulacionRuta(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);

        if (!Number.isInteger(rutaId) || rutaId <= 0) {
            res.status(400).json({ error: 'El parámetro rutaId debe ser un entero positivo' });
            return;
        }

        const estado = trackingSimulationService.obtenerEstado(rutaId);

        res.status(200).json({
            mensaje: 'Estado de simulación consultado',
            data: {
                rutaId,
                activa: Boolean(estado),
                simulacion: estado,
            },
        });
    }
}
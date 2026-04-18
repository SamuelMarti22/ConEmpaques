import { Request, Response } from 'express';
import { RepartidorDuplicadoEnLoteError, RepartidorYaAsignadoError, rutasService } from './rutas.service';
import { validarGuardarRutasRequest, validarRutaIdRequest } from './rutas.request.js';
import type {IPuntoEntrega} from '../../databases/mongoDB/schema';
import type { RutaRepartidorGeoJSON, RutaRepartidorResumen } from '../../types/routing.types';


export class RutasController {
    async obtenerRutasGuardadas(_req: Request, res: Response): Promise<void> {
        try {
            const rutasGuardadas = await rutasService.listarRutasGuardadas();
            res.status(200).json({ rutasGuardadas });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(500).json({ error: mensajeError });
        }
    }

    async guardarRutas(req: Request, res: Response): Promise<void> {
        try {
            const datosGuardar = validarGuardarRutasRequest(req, res);
            if (!datosGuardar) {
                return;
            }

            const rutasGuardadas = await rutasService.guardarRuta(
                datosGuardar.puntosEntrega,
                datosGuardar.rutasRepartidorGeoJSON,
                datosGuardar.fechaReparto,
                datosGuardar.horaInicioRecorrido,
            );

            res.status(201).json({
                mensaje: 'Rutas guardadas correctamente',
                rutasGuardadas,
            });
        } catch (error) {
            const mensajeError =
                error instanceof Error
                    ? error.message
                    : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
                        ? error.message
                        : 'Error interno del servidor';

            if (
                error instanceof RepartidorDuplicadoEnLoteError ||
                error instanceof RepartidorYaAsignadoError ||
                mensajeError.includes('ya tiene una ruta asignada') ||
                mensajeError.includes('aparece repetido en la misma generación')
            ) {
                res.status(409).json({ error: mensajeError });
                return;
            }

            res.status(500).json({ error: mensajeError });
        }
    }

    async eliminarRuta(req: Request, res: Response): Promise<void> {
        const rutaId = validarRutaIdRequest(req, res);
        if (rutaId === null) {
            return;
        }

        try {
            await rutasService.eliminarRuta(rutaId);
            res.status(200).json({ mensaje: 'Ruta eliminada correctamente' });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(400).json({ error: mensajeError });
        }
    }

    async consultarRutasRepartidor(req: Request, res: Response): Promise<void> {
        const idRepartidor = Number(req.params.idRepartidor);
        
        if (!Number.isInteger(idRepartidor) || idRepartidor <= 0) {
            res.status(400).json({ error: 'El parámetro idRepartidor debe ser un entero positivo' });
            return;
        }
    
        try {
            const detalleParadas = await rutasService.consultarRutasRepartidor(idRepartidor);
            res.status(200).json({ detalleParadas });
        }
        catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(500).json({ error: mensajeError });
        }
    }

    async consultarDetalleRuta(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);

        if (!Number.isInteger(rutaId) || rutaId <= 0) {
            res.status(400).json({ error: 'El parámetro rutaId debe ser un entero positivo' });
            return;
        }
        
        try {
            const detalleRuta = await rutasService.consultarDetalleRuta(String(rutaId));
            res.status(200).json({ detalleRuta });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(500).json({ error: mensajeError });
        }
    }
}

export const rutasController = new RutasController();
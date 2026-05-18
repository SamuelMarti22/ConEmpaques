import { Request, Response } from 'express';
import type { IPuntoEntrega } from '../../databases/mongoDB/schema';
import { obtenerRutaImagen, uploadMiddleware } from './guardarImagenes.service.js';
import { validarGuardarRutasRequest, validarRutaIdRequest } from './rutas.request.js';
import { RepartidorDuplicadoEnLoteError, RepartidorYaAsignadoError, rutasService } from './rutas.service';


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
            console.log('Error al consultar rutas del repartidor:', error);
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

    async actualizarEstadoPunto(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);
        const { puntoId: puntIdRaw, nuevoEstado, evidenciaImagenBase64 } = req.body;
        let puntoId = puntIdRaw;

        // Convertir puntoId a número si es string
        puntoId = Number(puntoId);
        
        if (!Number.isInteger(rutaId) || rutaId <= 0) {
            res.status(400).json({ error: 'El parámetro rutaId debe ser un entero positivo' });
            return;
        }
        if (!Number.isInteger(puntoId) || puntoId <= 0) {
            res.status(400).json({ error: `El campo puntoId debe ser un entero positivo. Recibido: ${req.body.puntoId} (tipo: ${typeof req.body.puntoId})` });
            return;
        }
        if (typeof nuevoEstado !== 'string' || !['EN_BODEGA', 'PENDIENTE', 'EN_ENTREGA', 'EN_CAMINO', 'ENTREGADO', 'FALLIDO'].includes(nuevoEstado)) {
            res.status(400).json({ error: 'El campo nuevoEstado debe ser uno de los siguientes: EN_BODEGA, PENDIENTE, EN_ENTREGA, EN_CAMINO, ENTREGADO, FALLIDO' });
            return;
        }
        if (evidenciaImagenBase64 != null && typeof evidenciaImagenBase64 !== 'string') {
            res.status(400).json({ error: 'El campo evidenciaImagenBase64 debe ser una cadena de texto base64 o null' });
            return;
        }
        
        try {
            await rutasService.actualizarEstadoPunto(
                rutaId,
                puntoId,
                nuevoEstado as IPuntoEntrega['estadoEntrega'],
                evidenciaImagenBase64,
            );
            res.status(200).json({ mensaje: 'Estado del punto actualizado correctamente' });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(500).json({ error: mensajeError });
        }
    }

    async subirEvidenciaImagen(req: Request, res: Response): Promise<void> {
        uploadMiddleware.single('imagen')(req, res, (error) => {
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
                return;
            }

            const archivo = (req as Request & { file?: Express.Multer.File }).file;

            if (!archivo) {
                res.status(400).json({ error: 'Debe enviar una imagen en el campo imagen' });
                return;
            }

            const rutaImagen = obtenerRutaImagen(archivo.filename);
            const urlCompleta = `${req.protocol}://${req.get('host')}${rutaImagen}`;

            res.status(201).json({
                mensaje: 'Imagen guardada correctamente',
                rutaImagen,
                urlCompleta,
                nombreArchivo: archivo.filename,
            });
        });
    }

    async finalizarRuta(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);

        if (!Number.isInteger(rutaId) || rutaId <= 0) {
            res.status(400).json({ error: 'El parámetro rutaId debe ser un entero positivo' });
            return;
        }

        try {
            await rutasService.finalizarRuta(rutaId);
            res.status(200).json({ mensaje: 'Ruta finalizada correctamente' });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(500).json({ error: mensajeError });
        }
    }

    async cancelarRuta(req: Request, res: Response): Promise<void> {
        const rutaId = Number(req.params.rutaId);

        if (!Number.isInteger(rutaId) || rutaId <= 0) {
            res.status(400).json({ error: 'El parámetro rutaId debe ser un entero positivo' });
            return;
        }

        try {
            await rutasService.cancelarRuta(rutaId);
            res.status(200).json({ mensaje: 'Ruta cancelada correctamente' });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
            res.status(500).json({ error: mensajeError });
        }
    }
}

export const rutasController = new RutasController();
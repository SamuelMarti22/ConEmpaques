import { Request, Response } from 'express';
import type {IPuntoEntrega, IRutaEntrega} from '../../databases/mongoDB/schema';
import type { RutaRepartidorGeoJSON } from '../../types/routing.types';
import { rutasService } from './rutas.service';

export class RutasController {
    async guardarRutas(req: Request, res: Response): Promise<void> {
        try {
            
            const puntosEntrega: IPuntoEntrega[] = req.body.puntosEntrega;
            const rutaRepartidorGeoJSON: RutaRepartidorGeoJSON = req.body.rutaRepartidorGeoJSON;
            const fechaReparto: Date = req.body.fechaReparto;

            if (!puntosEntrega || !rutaRepartidorGeoJSON || !fechaReparto) {
                res.status(400).json({ error: 'Faltan datos necesarios: puntosEntrega, rutaRepartidorGeoJSON o fechaReparto' });
                return;
            }

            const response = await rutasService.guardarRuta(puntosEntrega, rutaRepartidorGeoJSON);

            res.status(201).json({ message: 'Ruta guardada exitosamente' });
        } catch (error) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}

export const rutasController = new RutasController();
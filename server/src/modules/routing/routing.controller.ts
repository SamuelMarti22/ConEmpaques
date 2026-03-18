import { Request, Response } from 'express';
import { routingService } from './routing.service';
import { RutaRepartidorGeoJSON, RutaRepartidor } from '../../types/routing.types';
import { geoJSONService } from './geojson.service';

export class RoutingController {


    async getRutaOptima(req: Request, res: Response): Promise<void> {
        try {
            const rutaOptima = await routingService.getRutaOptima(req.body.puntos_entrega,req.body.capacidades_repartidores);
            const rutaOptimaTransformada = rutaOptima.map(ruta => geoJSONService.convertirRutaRepartidorAGeoJSON(ruta));

            res.json(rutaOptimaTransformada);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ error: errorMsg });
        }
    }

    
}

export const routingController = new RoutingController();
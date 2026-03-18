import { Request, Response } from 'express';
import { routingService } from './routing.service';
import { geoJSONService } from './geojson.service';

export class RoutingController {

    async getRutaOptima(req: Request, res: Response): Promise<void> {
        try {
            const rutaOptima = await routingService.getRutaOptima(req.body.puntosEntrega, req.body.capacidadesRepartidores);
            const rutaOptimaTransformada = rutaOptima.map(ruta => geoJSONService.convertirRutaRepartidorAGeoJSON(ruta));

            res.json(rutaOptimaTransformada);
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    
}

export const routingController = new RoutingController();
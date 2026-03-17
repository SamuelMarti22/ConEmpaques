import { Request, Response } from 'express';
import { routingService } from './routing.service';

export class RoutingController {


    async getRutaOptima (req: Request, res: Response): Promise<void> {
        try {
            const rutaOptima = await routingService.getRutaOptima(req.body.puntos_entrega,req.body.capacidades_repartidores);

            res.json(rutaOptima);
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    
}

export const routingController = new RoutingController();
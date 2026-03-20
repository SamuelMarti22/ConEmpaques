import type {IPuntoEntrega, IRutaEntrega} from '../../databases/mongoDB/schema';
import {RutaRepartidorGeoJSON} from '../../types/routing.types';
import { prisma } from "../../databases/prisma/lib/prisma.js";
import {RutaEntregaModel} from '../../databases/mongoDB/models/rutaEntrega.model.js';


export class RutasService{
     async guardarRuta(puntosEntrega: IPuntoEntrega[], RutaRepartidorGeoJSON: RutaRepartidorGeoJSON ): Promise<void> {
        
    }


}

export const rutasService = new RutasService();
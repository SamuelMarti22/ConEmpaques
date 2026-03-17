import env from '../../config/env.js';
import { PuntoEntrega, Deposito, CapacidadRepartidor, RutaRepartidor } from './../../types/routing.types.js';

export class RoutingService {

    private deposito: Deposito = { latitud: 6.2442, longitud: -75.5812 };
    private rutingServer = env.ROUTING_SERVER;

    async getRutaOptima(puntosEntrega: PuntoEntrega[], capacidadesRepartidores: CapacidadRepartidor[]): Promise<RutaRepartidor[]> {

        const requestBody = {
            deposito: this.deposito,
            puntos_entrega: puntosEntrega,
            capacidades_repartidores: capacidadesRepartidores
        }

        try {
            const response = await fetch(`${this.rutingServer}/optimizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })

            return await response.json() as RutaRepartidor[];
        }
        catch (error) {
            throw new Error("No fue posible encontrar una ruta optima para esta combinación de puntos de entrega y capacidades de repartidores.");
        }
    }
}

export const routingService = new RoutingService();
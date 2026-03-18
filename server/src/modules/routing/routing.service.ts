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

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as { rutas: RutaRepartidor[] };

            if (!data.rutas || !Array.isArray(data.rutas)) {
                throw new Error(`Respuesta inválida de servidor de routing: ${JSON.stringify(data)}`);
            }

            return data.rutas;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            throw new Error(`No fue posible encontrar una ruta optima: ${errorMsg}`);
        }
    }
}

export const routingService = new RoutingService();
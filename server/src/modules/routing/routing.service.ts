import env from '../../config/env.js';
import { PuntoEntrega, Deposito, CapacidadRepartidor, RutaRepartidor } from './../../types/routing.types.js';

export class RoutingService {

    private deposito: Deposito = { latitud: 6.2442, longitud: -75.5812 };
    private rutingServer = env.ROUTING_SERVER;

    async getRutaOptima(puntosEntrega: PuntoEntrega[], capacidadesRepartidores: CapacidadRepartidor[]): Promise<RutaRepartidor[]> {

        const capacidadesRepartidoresRouting = capacidadesRepartidores.map((repartidor) => ({
            idRepartidor: repartidor.id,
            capacidadRepartidor: repartidor.capacidad,
        }));

        const requestBody = {
            deposito: this.deposito,
            puntos_entrega: puntosEntrega,
            capacidades_repartidores: capacidadesRepartidoresRouting
        }

        try {
            const response = await fetch(`${this.rutingServer}/optimizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })

            const data = await response.json() as { rutas?: RutaRepartidor[], detail?: { error: string, razon: string } };
            
            // Manejo de errores HTTP
            if (!response.ok) {
                const detalle = data.detail;
                if (detalle) {
                    throw new Error(`${detalle.error}: ${detalle.razon}`);
                }
                throw new Error(`Error ${response.status} en el servidor de routing`);
            }

            if (!data.rutas || !Array.isArray(data.rutas)) {
                throw new Error(`Respuesta inválida de servidor de routing: ${JSON.stringify(data)}`);
            }

            if (data.rutas.length === 0) {
                throw new Error("No se pudieron generar rutas. Verifica que la capacidad total de los repartidores sea suficiente para todos los puntos de entrega.");
            }

            return data.rutas;
        }
        catch (error) {
            // Re-lanzar con el mensaje original si es un error conocido
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("No fue posible encontrar una ruta optima para esta combinación de puntos de entrega y capacidades de repartidores.");
        }
    }
}

export const routingService = new RoutingService();
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
        };

        try {
            const response = await fetch(`${this.rutingServer}/optimizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            // Manejo de errores HTTP
            if (!response.ok) {
                const rawError = typeof response.text === 'function' ? await response.text() : '';
                if (rawError && rawError.trim().length > 0) {
                    throw new Error(this.obtenerDetalleErrorRouting(rawError, response.status));
                }

                if (typeof response.json === 'function') {
                    const dataError = await response.json() as { detail?: { error?: string, razon?: string }, error?: string, message?: string };
                    const detalle = dataError.detail;
                    const mensaje = detalle?.error && detalle?.razon
                        ? `${detalle.error}: ${detalle.razon}`
                        : detalle?.error ?? dataError.error ?? dataError.message;

                    if (mensaje && mensaje.trim().length > 0) {
                        throw new Error(`El servicio de optimización respondió con error ${response.status}. ${mensaje}`);
                    }
                }

                throw new Error(`El servicio de optimización respondió con error ${response.status}.`);
            }

            if (typeof response.json !== 'function') {
                throw new Error("Respuesta inválida de servidor de routing: el servidor no expuso un cuerpo JSON.");
            }

            const data = await response.json() as { rutas?: RutaRepartidor[] };

            if (!data.rutas || !Array.isArray(data.rutas)) {
                throw new Error(`Respuesta inválida de servidor de routing: ${JSON.stringify(data)}`);
            }

            if (data.rutas.length === 0) {
                throw new Error("No se pudieron generar rutas. Verifica que la capacidad total de los repartidores sea suficiente para todos los puntos de entrega.");
            }

            return data.rutas;
        } catch (error) {
            // Manejo de errores de red y conexión
            if (error instanceof Error) {
                const mensaje = error.message.toLowerCase();
                if (
                    mensaje.includes('fetch failed') ||
                    mensaje.includes('econnrefused') ||
                    mensaje.includes('network')
                ) {
                    throw new Error(
                        `No fue posible conectar con el microservicio de optimización (${this.rutingServer}). Verifica que esté ejecutándose en el puerto esperado.`,
                        { cause: error }
                    );
                }
                // Si es un error lanzado por validación o respuesta del microservicio
                throw error;
            }
            throw new Error("No fue posible encontrar una ruta optima para esta combinación de puntos de entrega y capacidades de repartidores.", { cause: error });
        }
    }

    private obtenerDetalleErrorRouting(rawError: string, status: number): string {
        const mensajeBase = `El servicio de optimización respondió con error ${status}.`;

        if (!rawError || rawError.trim().length === 0) {
            return mensajeBase;
        }

        try {
            const parsed = JSON.parse(rawError) as { detail?: string; error?: string; message?: string };
            const detail = parsed.detail ?? parsed.error ?? parsed.message;
            if (detail && detail.trim().length > 0) {
                return `${mensajeBase} ${detail}`;
            }
        } catch {
            // Si no es JSON, se retorna el texto crudo para diagnóstico.
        }

        return `${mensajeBase} ${rawError}`;
    }
}

export const routingService = new RoutingService();
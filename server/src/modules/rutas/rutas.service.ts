import type { IPuntoEntrega } from '../../databases/mongoDB/schema';
import { RutaRepartidorGeoJSON } from '../../types/routing.types';
import { prisma } from "../../databases/prisma/lib/prisma.js";
import { RutaEntregaModel } from '../../databases/mongoDB/models/rutaEntrega.model.js';

type EstadoRepartidorResumen = 'disponible' | 'en ruta' | 'finalizado';

interface DetalleParadaResumen {
    orden: number;
    puntoId: number;
    direccion: string | null;
    cliente: string | null;
    estadoEntrega: 'Pendiente' | 'En camino' | 'Entregado';
    tiempoEstimadoParada: number | null;
}

export interface RutaGuardadaResumen {
    rutaId: number;
    repartidor: {
        id: number;
        nombre: string | null;
        estado: EstadoRepartidorResumen;
        capacidad: number | null;
    };
    resumen: {
        numeroPedidos: number;
        cargaActualKg: number;
        distanciaTotal: number;
        tiempoEstimado: number | null;
        horaInicioEstimada: string | null;
        horaFinEstimada: string | null;
    };
    detalleParadas: DetalleParadaResumen[];
}

function mapearEstadoRepartidor(estadoRuta: string): EstadoRepartidorResumen {
    if (estadoRuta === 'EN_PROCESO') {
        return 'en ruta';
    }

    if (estadoRuta === 'ENTREGADA') {
        return 'finalizado';
    }

    return 'disponible';
}

function calcularHoraFinEstimada(fechaInicio: Date, tiempoEstimadoSegundos: number | null): string | null {
    if (tiempoEstimadoSegundos === null || tiempoEstimadoSegundos <= 0) {
        return null;
    }

    return new Date(fechaInicio.getTime() + tiempoEstimadoSegundos * 1000).toISOString();
}


export class RutasService {
    async guardarRuta(
        puntosEntrega: IPuntoEntrega[],
        rutasRepartidorGeoJSON: RutaRepartidorGeoJSON[],
        fechaReparto: Date | string,
    ): Promise<RutaGuardadaResumen[]> {

        const fechaRepartoNormalizada = new Date(fechaReparto);
        if (Number.isNaN(fechaRepartoNormalizada.getTime())) {
            throw new Error('fechaReparto es inválida');
        }

        const puntosEntregaDiccionario = this.construirDiccionarioPuntosEntrega(puntosEntrega);
        const rutasGuardadas: RutaGuardadaResumen[] = [];

        console.log("Que llego al service", puntosEntregaDiccionario, rutasRepartidorGeoJSON, fechaReparto);
        console.log("Longitud de rutasRepartidorGeoJSON:", rutasRepartidorGeoJSON.length);

        try {
            while (rutasRepartidorGeoJSON.length != 0) {
                const ruta = rutasRepartidorGeoJSON.pop();

                if (!ruta || !ruta.repartidor_id) {
                    continue;
                }

                // Guardar la ruta en MySQL usando Prisma
                const rutaCreada = await prisma.ruta.create({
                    data: {
                        repartidorId: ruta.repartidor_id,
                        fechaReparto: fechaRepartoNormalizada,
                        estadoRuta: 'PENDIENTE',
                        horaInicioEntrega: null,
                        horaFinalizacionEntrega: null,
                        distanciaTotal: ruta.distancia_total,
                        tiempoEstimado: ruta.tiempo_estimado > 0 ? Math.round(ruta.tiempo_estimado) : null,
                    }
                });

                // Transformar los puntos de entrega de la ruta al formato esperado por MongoDB
                const puntosTransformados = ruta.ruta.map(punto =>
                    this.construirPuntosEntrega(puntosEntregaDiccionario[punto]!)
                );
                console.log("Puntos transformados:", puntosTransformados);

                // Guardar la ruta de entrega en MongoDB
                const rutaEntrega = await RutaEntregaModel.create({
                    rutaId: rutaCreada.id,
                    puntosEntrega: puntosTransformados
                });
                console.log("RutaEntrega guardada en MongoDB:", rutaEntrega);

                const repartidor = await prisma.usuario.findUnique({
                    where: {
                        id: ruta.repartidor_id,
                    },
                    select: {
                        id: true,
                        nombre: true,
                        capacidadVehiculo: true,
                    },
                });

                const tiempoEstimado =
                    typeof ruta.tiempo_estimado === 'number' && ruta.tiempo_estimado > 0
                        ? ruta.tiempo_estimado
                        : null;

                const cargaActualKg = ruta.ruta.reduce((acumulado, puntoId) => {
                    const pesoProducto = puntosEntregaDiccionario[puntoId]?.pesoProducto;
                    if (typeof pesoProducto !== 'number' || Number.isNaN(pesoProducto)) {
                        return acumulado;
                    }

                    return acumulado + pesoProducto;
                }, 0);

                rutasGuardadas.push({
                    rutaId: rutaCreada.id,
                    repartidor: {
                        id: ruta.repartidor_id,
                        nombre: repartidor?.nombre ?? null,
                        estado: mapearEstadoRepartidor(rutaCreada.estadoRuta),
                        capacidad: repartidor?.capacidadVehiculo ?? null,
                    },
                    resumen: {
                        numeroPedidos: ruta.ruta.length,
                        cargaActualKg,
                        distanciaTotal: ruta.distancia_total,
                        tiempoEstimado,
                        horaInicioEstimada: fechaRepartoNormalizada.toISOString(),
                        horaFinEstimada: calcularHoraFinEstimada(fechaRepartoNormalizada, tiempoEstimado),
                    },
                    detalleParadas: ruta.ruta.map((puntoId, indiceParada) => {
                        const punto = puntosEntregaDiccionario[puntoId];
                        return {
                            orden: indiceParada + 1,
                            puntoId,
                            direccion: punto?.direccion ?? null,
                            cliente: punto?.nombreCliente ?? null,
                            estadoEntrega: 'Pendiente',
                            tiempoEstimadoParada: null,
                        };
                    }),
                });
            }

            return rutasGuardadas;
        } catch (error) {
            console.error("Error en guardarRuta:", error);
            throw error;
        }
    }

    async eliminarRuta(rutaId: number): Promise<void> {
        const rutaEliminada = await prisma.ruta.deleteMany({
            where: {
                id: rutaId,
            },
        });

        if (rutaEliminada.count === 0) {
            throw new Error(`No existe la ruta ${rutaId}`);
        }

        await RutaEntregaModel.deleteMany({
            rutaId,
        });
    }

    async listarRutasGuardadas(): Promise<RutaGuardadaResumen[]> {
        const rutas = await prisma.ruta.findMany({
            orderBy: {
                id: 'desc',
            },
            include: {
                repartidor: {
                    select: {
                        id: true,
                        nombre: true,
                        capacidadVehiculo: true,
                    },
                },
            },
        });

        if (rutas.length === 0) {
            return [];
        }

        const rutasMongo = await RutaEntregaModel.find({
            rutaId: {
                $in: rutas.map((ruta) => ruta.id),
            },
        }).lean();

        const rutasMongoPorRutaId = new Map<number, (typeof rutasMongo)[number]>();
        rutasMongo.forEach((rutaMongo) => {
            rutasMongoPorRutaId.set(rutaMongo.rutaId, rutaMongo);
        });

        return rutas.map((ruta) => {
            const rutaMongo = rutasMongoPorRutaId.get(ruta.id);
            const puntos = rutaMongo?.puntosEntrega ?? [];
            const cargaActualKg = puntos.reduce((acumulado, punto) => {
                const pesoProducto = punto.pesoProducto;
                if (typeof pesoProducto !== 'number' || Number.isNaN(pesoProducto)) {
                    return acumulado;
                }

                return acumulado + pesoProducto;
            }, 0);

            return {
                rutaId: ruta.id,
                repartidor: {
                    id: ruta.repartidorId,
                    nombre: ruta.repartidor?.nombre ?? null,
                    estado: mapearEstadoRepartidor(ruta.estadoRuta),
                    capacidad: ruta.repartidor?.capacidadVehiculo ?? null,
                },
                resumen: {
                    numeroPedidos: puntos.length,
                    cargaActualKg,
                    distanciaTotal: ruta.distanciaTotal ?? 0,
                    tiempoEstimado: ruta.tiempoEstimado ?? null,
                    horaInicioEstimada: ruta.fechaReparto.toISOString(),
                    horaFinEstimada: calcularHoraFinEstimada(ruta.fechaReparto, ruta.tiempoEstimado),
                },
                detalleParadas: puntos.map((punto, indiceParada) => ({
                    orden: indiceParada + 1,
                    puntoId: punto.id,
                    direccion: punto.direccion ?? null,
                    cliente: punto.nombreCliente ?? null,
                    estadoEntrega: punto.estadoEntrega === 'ENTREGADO' ? 'Entregado' : 'Pendiente',
                    tiempoEstimadoParada: null,
                })),
            };
        });
    }

    construirPuntosEntrega(punto: any): IPuntoEntrega {
        return {
            id: punto.id,
            nombreCliente: punto.nombreCliente,
            codigo: punto.codigo,
            contactoCliente: punto.contactoCliente,
            latitud: punto.latitud,
            longitud: punto.longitud,
            pesoProducto: punto.pesoProducto,
            descripcionEntrega: punto.descripcionEntrega,
            direccion: punto.direccion,
            estadoEntrega: 'PENDIENTE'
        }
    }

    construirDiccionarioPuntosEntrega(puntos: IPuntoEntrega[]): Record<string, IPuntoEntrega> {
        return puntos.reduce((acc, punto) => {
            acc[punto.id] = punto;
            return acc;
        }, {} as Record<string, IPuntoEntrega>);
    }

}

export const rutasService = new RutasService();
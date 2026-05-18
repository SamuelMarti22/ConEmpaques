
import { randomUUID } from 'crypto';
import { RutaEntregaModel } from '../../databases/mongoDB/models/rutaEntrega.model.js';
import type { IPuntoEntrega } from '../../databases/mongoDB/schema';
import { EstadoRuta } from '../../databases/prisma/generated/prisma/enums.js';
import { prisma } from "../../databases/prisma/lib/prisma.js";
import { RutaRepartidorGeoJSON, RutaRepartidorResumen } from '../../types/routing.types';

const ESTADOS_RUTA_ASIGNADA = [EstadoRuta.PENDIENTE, EstadoRuta.EN_PROCESO] as const;
const BLOQUEOS_GUARDADO_RUTA = new Set<string>();
let DEPURACION_RUTAS_EN_CURSO = false;


type EstadoRepartidorResumen = 'disponible' | 'en ruta' | 'finalizado';

interface DetalleParadaResumen {
    orden: number;
    puntoId: number;
    codigoSeguimiento: string | null;
    direccion: string | null;
    cliente: string | null;
    contactoCliente: string | null;
    estadoEntrega: 'Pendiente' | 'En camino' | 'Entregado' | 'EN_BODEGA' | 'PENDIENTE' | 'EN_ENTREGA' | 'EN_CAMINO' | 'ENTREGADO' | 'FALLIDO';
    tiempoEstimadoParada: number | null;
    pesoProducto: number | null;
    descripcionEntrega: string | null;
    latitud: number;
    longitud: number;
}

interface GeometriaRutaResumen {
    type: 'Feature';
    geometry: {
        type: 'LineString';
        coordinates: number[][];
    };
}

export interface RutaGuardadaResumen {
    rutaId: number;
    fechaReparto: string;
    estadoRuta: EstadoRuta;
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
    geometria: GeometriaRutaResumen;
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

function obtenerEstadoRutaEfectivo(
    estadoRuta: EstadoRuta,
    puntosEntrega: Array<{ estadoEntrega?: string | null }> = [],
): EstadoRuta {
    if (estadoRuta === EstadoRuta.ENTREGADA || estadoRuta === EstadoRuta.CANCELADA) {
        return estadoRuta;
    }

    if (
        puntosEntrega.length > 0 &&
        puntosEntrega.every((punto) => {
            const estado = String(punto.estadoEntrega ?? '').toUpperCase();
            return estado === 'ENTREGADO' || estado === 'FALLIDO';
        })
    ) {
        return EstadoRuta.ENTREGADA;
    }

    return estadoRuta;
}

function formatearFechaHoraLocal(fecha: Date | null | undefined): string | null {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
        return null;
    }

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    const segundos = String(fecha.getSeconds()).padStart(2, '0');

    return `${anio}-${mes}-${dia}T${horas}:${minutos}:${segundos}`;
}

function calcularHoraFinEstimada(fechaInicio: Date, tiempoEstimadoSegundos: number | null): string | null {
    if (tiempoEstimadoSegundos === null || tiempoEstimadoSegundos <= 0) {
        return null;
    }

    return formatearFechaHoraLocal(new Date(fechaInicio.getTime() + tiempoEstimadoSegundos * 1000));
}

function combinarFechaYHora(fechaBase: Date, horaHHMM: string): Date {
    const [horas, minutos] = horaHHMM.split(':').map(Number);
    return new Date(
        fechaBase.getFullYear(),
        fechaBase.getMonth(),
        fechaBase.getDate(),
        horas,
        minutos,
        0,
        0,
    );
}

function obtenerInicioDiaLocal(fechaBase: Date): Date {
    return new Date(
        fechaBase.getFullYear(),
        fechaBase.getMonth(),
        fechaBase.getDate(),
        0,
        0,
        0,
        0,
    );
}

function obtenerClaveFechaLocal(fecha: Date | null | undefined): string {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
        return '';
    }

    const anio = String(fecha.getFullYear());
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function formatearFechaLocal(fecha: Date): string {
    // `fechaReparto` se persiste como DATE; usar UTC evita desfases por zona horaria.
    const anio = fecha.getUTCFullYear();
    const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getUTCDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function obtenerClaveBloqueoGuardado(repartidorId: number, fechaClave: string, hora: string): string {
    return `${repartidorId}|${fechaClave}|${hora}`;
}

function generarCodigoSeguimiento(): string {
    return `PE-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

// Helper para obtener el ID de un punto (puede ser 'id' o '_id')
function obtenerIdPunto(punto: any): number {
    if (typeof punto.id === 'number') {
        return punto.id;
    }
    if (punto._id instanceof Object && 'toString' in punto._id) {
        // Si es un ObjectId de MongoDB, convertir a string y luego a número
        return parseInt(String(punto._id), 16);
    }
    return 0;
}

export class RepartidorYaAsignadoError extends Error {
    constructor(repartidorId: number, detalle?: string) {
        const sufijo = detalle ? ` (${detalle})` : '';
        super(`El repartidor ${repartidorId} ya tiene una ruta asignada para la fecha seleccionada${sufijo}`);
        this.name = 'RepartidorYaAsignadoError';
    }
}

export class RepartidorDuplicadoEnLoteError extends Error {
    constructor(repartidorId: number, detalle?: string) {
        const sufijo = detalle ? ` (${detalle})` : '';
        super(`El repartidor ${repartidorId} aparece repetido en la misma generación de rutas${sufijo}`);
        this.name = 'RepartidorDuplicadoEnLoteError';
    }
}


export class RutasService {
    async generarCodigoSeguimientoUnico(): Promise<string> {
        for (let intento = 0; intento < 10; intento += 1) {
            const codigoSeguimiento = generarCodigoSeguimiento();
            const existe = await RutaEntregaModel.exists({
                'puntosEntrega.codigo': codigoSeguimiento,
            });

            if (!existe) {
                return codigoSeguimiento;
            }
        }

        throw new Error('No se pudo generar un codigo de seguimiento unico');
    }

    async depurarRutasAntiguas(diasRetencion = 30): Promise<{ rutasEliminadas: number; documentosMongoEliminados: number; puntosEliminados: number }> {
        if (!Number.isInteger(diasRetencion) || diasRetencion <= 0) {
            throw new Error('diasRetencion debe ser un entero positivo');
        }

        if (DEPURACION_RUTAS_EN_CURSO) {
            return { rutasEliminadas: 0, documentosMongoEliminados: 0, puntosEliminados: 0 };
        }

        DEPURACION_RUTAS_EN_CURSO = true;

        try {
            const fechaLimite = obtenerInicioDiaLocal(new Date());
            fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

            const rutasAntiguas = await prisma.ruta.findMany({
                where: {
                    fechaReparto: {
                        lt: fechaLimite,
                    },
                },
                select: {
                    id: true,
                },
            });

            if (rutasAntiguas.length === 0) {
                return { rutasEliminadas: 0, documentosMongoEliminados: 0, puntosEliminados: 0 };
            }

            const rutasIds = rutasAntiguas.map((ruta) => ruta.id);

            // PASO 1: Obtener documentos de Mongo para contar puntos que serán eliminados
            const rutasEntregaAEliminar = await RutaEntregaModel.find({
                rutaId: {
                    $in: rutasIds,
                },
            }).lean();

            let totalPuntosAEliminar = 0;
            rutasEntregaAEliminar.forEach((rutaEntrega) => {
                const cantidadPuntos = rutaEntrega.puntosEntrega?.length ?? 0;
                totalPuntosAEliminar += cantidadPuntos;
            });

            console.log(`🔍 Depuración de rutas (>${diasRetencion} días): ${rutasIds.length} rutas antiguas encontradas con ${totalPuntosAEliminar} puntos de entrega asociados`);

            // PASO 2: Eliminar documentos de Mongo (que incluyen puntos embebidos)
            const resultadoMongo = await RutaEntregaModel.deleteMany({
                rutaId: {
                    $in: rutasIds,
                },
            });

            console.log(`✅ MONGO: ${resultadoMongo.deletedCount ?? 0} documentos eliminados (contenían ${totalPuntosAEliminar} puntos de entrega)`);

            // PASO 3: Eliminar rutas de MySQL
            const resultadoMysql = await prisma.ruta.deleteMany({
                where: {
                    id: {
                        in: rutasIds,
                    },
                },
            });

            console.log(`✅ MYSQL: ${resultadoMysql.count} rutas eliminadas`);

            return {
                rutasEliminadas: resultadoMysql.count,
                documentosMongoEliminados: typeof resultadoMongo.deletedCount === 'number' ? resultadoMongo.deletedCount : 0,
                puntosEliminados: totalPuntosAEliminar,
            };
        } finally {
            DEPURACION_RUTAS_EN_CURSO = false;
        }
    }

    async guardarRuta(
        puntosEntrega: IPuntoEntrega[],
        rutasRepartidorGeoJSON: RutaRepartidorGeoJSON[],
        fechaReparto: Date | string,
        horaInicioRecorrido: string,
    ): Promise<RutaGuardadaResumen[]> {

        const fechaRepartoNormalizada = new Date(fechaReparto);
        if (Number.isNaN(fechaRepartoNormalizada.getTime())) {
            throw new Error('fechaReparto es inválida');
        }

        const horaInicioEntrega = combinarFechaYHora(fechaRepartoNormalizada, horaInicioRecorrido);
        const fechaRepartoPersistencia = obtenerInicioDiaLocal(horaInicioEntrega);
        const claveFechaReparto = obtenerClaveFechaLocal(horaInicioEntrega);

        const puntosEntregaDiccionario = this.construirDiccionarioPuntosEntrega(puntosEntrega);
        const rutasGuardadas: RutaGuardadaResumen[] = [];
        const repartidoresAsignadosEnLote = new Set<number>();

        try {
            for (const ruta of rutasRepartidorGeoJSON) {
                if (!ruta || !ruta.repartidor_id) {
                    continue;
                }

                if (repartidoresAsignadosEnLote.has(ruta.repartidor_id)) {
                    throw new RepartidorDuplicadoEnLoteError(
                        ruta.repartidor_id,
                        `fecha=${claveFechaReparto} hora=${horaInicioRecorrido}`,
                    );
                }

                const claveBloqueo = obtenerClaveBloqueoGuardado(
                    ruta.repartidor_id,
                    claveFechaReparto,
                    horaInicioRecorrido,
                );

                if (BLOQUEOS_GUARDADO_RUTA.has(claveBloqueo)) {
                    throw new RepartidorYaAsignadoError(
                        ruta.repartidor_id,
                        `asignación en proceso fecha=${claveFechaReparto} hora=${horaInicioRecorrido}`,
                    );
                }

                BLOQUEOS_GUARDADO_RUTA.add(claveBloqueo);

                try {

                const tiempoEstimadoPersistencia =
                    ruta.tiempo_estimado > 0 ? Math.round(ruta.tiempo_estimado) : null;
                const duracionSegundos = tiempoEstimadoPersistencia ?? 0;
                const horaFinalizacionEntrega = new Date(horaInicioEntrega.getTime() + duracionSegundos * 1000);

                if (Number.isNaN(horaInicioEntrega.getTime()) || Number.isNaN(horaFinalizacionEntrega.getTime())) {
                    throw new Error('No se pudo calcular horaInicioEntrega/horaFinalizacionEntrega para la ruta');
                }

                const rutasActivasMismaFecha = await prisma.ruta.findMany({
                    where: {
                        repartidorId: ruta.repartidor_id,
                        estadoRuta: {
                            in: [...ESTADOS_RUTA_ASIGNADA],
                        },
                    },
                    select: {
                        id: true,
                        fechaReparto: true,
                        horaInicioEntrega: true,
                        horaFinalizacionEntrega: true,
                    },
                });

                const nuevaHoraFin = horaFinalizacionEntrega;
                const existeConflictoHorario = rutasActivasMismaFecha.some((rutaActiva) => {
                    const fechaReferenciaRuta = rutaActiva.horaInicioEntrega ?? rutaActiva.fechaReparto;

                    if (obtenerClaveFechaLocal(fechaReferenciaRuta) !== claveFechaReparto) {
                        return false;
                    }

                    const inicioExistente = rutaActiva.horaInicioEntrega;
                    if (!inicioExistente) {
                        return false;
                    }

                    const finExistente: Date = rutaActiva.horaFinalizacionEntrega ?? inicioExistente;

                    return inicioExistente < nuevaHoraFin && horaInicioEntrega < finExistente;
                });

                if (existeConflictoHorario) {
                    throw new RepartidorYaAsignadoError(
                        ruta.repartidor_id,
                        `fecha=${claveFechaReparto} hora=${horaInicioRecorrido}`,
                    );
                }

                // Guardar la ruta en MySQL usando Prisma

                const rutaCreada = await prisma.ruta.create({
                    data: {
                        repartidorId: ruta.repartidor_id,
                        fechaReparto: fechaRepartoPersistencia,
                        room: `R-${ruta.repartidor_id}-${Date.now()}`,
                        estadoRuta: EstadoRuta.PENDIENTE,
                        horaInicioEntrega,
                        horaFinalizacionEntrega,
                        distanciaTotal: ruta.distancia_total,
                        tiempoEstimado: tiempoEstimadoPersistencia,
                    }
                });

                // Transformar los puntos de entrega de la ruta al formato esperado por MongoDB
                const puntosTransformados: IPuntoEntrega[] = [];
                const codigosSeguimientoPorPuntoId = new Map<number, string>();
                for (const puntoId of ruta.ruta) {
                    const puntoOriginal = puntosEntregaDiccionario[puntoId];
                    if (!puntoOriginal) {
                        throw new Error(`No se encontro el punto de entrega ${puntoId} en el lote recibido`);
                    }

                    const codigoSeguimiento = await this.generarCodigoSeguimientoUnico();
                    codigosSeguimientoPorPuntoId.set(puntoId, codigoSeguimiento);
                    puntosTransformados.push(this.construirPuntosEntrega(puntoOriginal, codigoSeguimiento));
                }

                // Guardar la ruta de entrega en MongoDB
                await RutaEntregaModel.create({
                    rutaId: rutaCreada.id,
                    puntosEntrega: puntosTransformados,
                    geometria: ruta.geometria?.geometry?.coordinates ?? [],
                });

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
                    fechaReparto: formatearFechaLocal(rutaCreada.fechaReparto),
                    estadoRuta: rutaCreada.estadoRuta,
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
                        horaInicioEstimada: formatearFechaHoraLocal(rutaCreada.horaInicioEntrega),
                        horaFinEstimada:
                            formatearFechaHoraLocal(rutaCreada.horaFinalizacionEntrega) ??
                            calcularHoraFinEstimada(horaInicioEntrega, tiempoEstimado),
                    },
                    detalleParadas: ruta.ruta.map((puntoId, indiceParada) => {
                        const punto = puntosEntregaDiccionario[puntoId];
                        return {
                            orden: indiceParada + 1,
                            puntoId: obtenerIdPunto(punto || {}),
                            codigoSeguimiento: codigosSeguimientoPorPuntoId.get(puntoId) ?? punto?.codigo ?? null,
                            direccion: punto?.direccion ?? null,
                            cliente: punto?.nombreCliente ?? null,
                            contactoCliente: punto?.contactoCliente ?? null,
                            estadoEntrega: 'Pendiente',
                            tiempoEstimadoParada: null,
                            pesoProducto: punto?.pesoProducto ?? null,
                            descripcionEntrega: punto?.descripcionEntrega ?? null,
                            latitud: punto?.latitud ?? 0,
                            longitud: punto?.longitud ?? 0,
                        };
                    }),
                    geometria: {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: ruta.geometria?.geometry?.coordinates ?? [],
                        },
                    },
                });

                repartidoresAsignadosEnLote.add(ruta.repartidor_id);
                } finally {
                    BLOQUEOS_GUARDADO_RUTA.delete(claveBloqueo);
                }
            }

            return rutasGuardadas;
        } catch (error) {
            console.error("Error en guardarRuta:", error);
            throw error;
        }
    }

    async eliminarRuta(rutaId: number): Promise<void> {
        const rutaExistente = await prisma.ruta.findUnique({
            where: {
                id: rutaId,
            },
            select: {
                id: true,
            },
        });

        if (!rutaExistente) {
            throw new Error(`No existe la ruta ${rutaId}`);
        }

        await RutaEntregaModel.deleteMany({
            rutaId,
        });

        const rutaEliminada = await prisma.ruta.deleteMany({
            where: {
                id: rutaId,
            },
        });

        if (rutaEliminada.count === 0) {
            throw new Error(`No existe la ruta ${rutaId}`);
        }
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
                fechaReparto: formatearFechaLocal(ruta.fechaReparto),
                estadoRuta: ruta.estadoRuta,
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
                    horaInicioEstimada: formatearFechaHoraLocal(ruta.horaInicioEntrega),
                    horaFinEstimada:
                        formatearFechaHoraLocal(ruta.horaFinalizacionEntrega) ??
                        (ruta.horaInicioEntrega
                            ? calcularHoraFinEstimada(ruta.horaInicioEntrega, ruta.tiempoEstimado)
                            : null),
                },
                detalleParadas: puntos.map((punto, indiceParada) => ({
                    orden: indiceParada + 1,
                    puntoId: obtenerIdPunto(punto),
                    codigoSeguimiento: punto.codigo ?? null,
                    direccion: punto.direccion ?? null,
                    cliente: punto.nombreCliente ?? null,
                    contactoCliente: punto.contactoCliente ?? null,
                    estadoEntrega: punto.estadoEntrega,
                    tiempoEstimadoParada: null,
                    pesoProducto: punto.pesoProducto ?? null,
                    descripcionEntrega: punto.descripcionEntrega ?? null,
                    latitud: punto.latitud,
                    longitud: punto.longitud,
                })),
                geometria: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: Array.isArray(rutaMongo?.geometria) ? rutaMongo.geometria : [],
                    },
                },
            };
        });
    }

    construirPuntosEntrega(punto: IPuntoEntrega, codigoSeguimiento: string): IPuntoEntrega {
        return {
            id: punto.id,
            nombreCliente: punto.nombreCliente,
            codigo: codigoSeguimiento,
            contactoCliente: punto.contactoCliente,
            latitud: punto.latitud,
            longitud: punto.longitud,
            pesoProducto: punto.pesoProducto,
            descripcionEntrega: punto.descripcionEntrega,
            direccion: punto.direccion,
            estadoEntrega: 'EN_BODEGA'
        }
    }

    construirDiccionarioPuntosEntrega(puntos: IPuntoEntrega[]): Record<string, IPuntoEntrega> {
        return puntos.reduce((acc, punto) => {
            acc[punto.id] = punto;
            return acc;
        }, {} as Record<string, IPuntoEntrega>);
    }

    async consultarRutasRepartidor(idRepartidor: number): Promise<RutaRepartidorResumen[]> {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const sieteDiasDespues = new Date(hoy);
        sieteDiasDespues.setDate(hoy.getDate() + 7);

        // Buscar rutas en el rango de fechas
        const rutas = await prisma.ruta.findMany({
            where: {
                repartidorId: idRepartidor,
                fechaReparto: {
                    gte: hoy,
                    lt: sieteDiasDespues,
                },
            },
            orderBy: {
                fechaReparto: 'asc',
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

        // Buscar detalles en MongoDB
        const rutasMongo = await RutaEntregaModel.find({
            rutaId: { $in: rutas.map(r => r.id) },
        }).lean();
        const rutasMongoPorRutaId = new Map<number, (typeof rutasMongo)[number]>();
        rutasMongo.forEach(rutaMongo => rutasMongoPorRutaId.set(rutaMongo.rutaId, rutaMongo));

        // Formatear respuesta
        const resultado = rutas.map(ruta => {
            const rutaMongo = rutasMongoPorRutaId.get(ruta.id);
            const estadoRutaEfectivo = obtenerEstadoRutaEfectivo(ruta.estadoRuta, rutaMongo?.puntosEntrega ?? []);
            return {
                id: ruta.id,
                repartidorId: ruta.repartidorId,
                fechaReparto: ruta.fechaReparto,
                estadoRuta: estadoRutaEfectivo,
                horaInicioEntrega: ruta.horaInicioEntrega,
                horaFinalizacionEntrega: ruta.horaFinalizacionEntrega,
                distanciaTotal: ruta.distanciaTotal,
                tiempoEstimado: ruta.tiempoEstimado,
                createdAt: ruta.createdAt,
                cantidadPuntos: Array.isArray(rutaMongo?.puntosEntrega) ? rutaMongo.puntosEntrega.length : 0,
            };
        });
        return resultado;
    }

    async consultarDetalleRuta(rutaId: string): Promise<RutaGuardadaResumen> {
        const rutaIdNumber = parseInt(rutaId, 10);
        
        if (isNaN(rutaIdNumber)) {
            throw new Error('El ID de la ruta debe ser un número válido');
        }

        // Buscar la ruta en MySQL
        const ruta = await prisma.ruta.findUnique({
            where: {
                id: rutaIdNumber,
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

        if (!ruta) {
            throw new Error(`No existe la ruta con ID ${rutaIdNumber}`);
        }

        // Buscar los detalles en MongoDB
        const rutaMongo = await RutaEntregaModel.findOne({
            rutaId: rutaIdNumber,
        }).lean();

        if (!rutaMongo) {
            throw new Error(`No se encontraron detalles de la ruta ${rutaIdNumber} en MongoDB`);
        }

        const puntos = rutaMongo.puntosEntrega ?? [];
        const cargaActualKg = puntos.reduce((acumulado, punto) => {
            const pesoProducto = punto.pesoProducto;
            if (typeof pesoProducto !== 'number' || Number.isNaN(pesoProducto)) {
                return acumulado;
            }

            return acumulado + pesoProducto;
        }, 0);

        const estadoRutaEfectivo = obtenerEstadoRutaEfectivo(ruta.estadoRuta, puntos);

        return {
            rutaId: ruta.id,
            fechaReparto: ruta.fechaReparto.toISOString(),
            estadoRuta: estadoRutaEfectivo,
            repartidor: {
                id: ruta.repartidorId,
                nombre: ruta.repartidor?.nombre ?? null,
                estado: mapearEstadoRepartidor(estadoRutaEfectivo),
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
                puntoId: obtenerIdPunto(punto),
                codigoSeguimiento: punto.codigo ?? null,
                direccion: punto.direccion ?? null,
                cliente: punto.nombreCliente ?? null,
                contactoCliente: punto.contactoCliente ?? null,
                estadoEntrega: punto.estadoEntrega,
                tiempoEstimadoParada: null,
                pesoProducto: punto.pesoProducto ?? null,
                descripcionEntrega: punto.descripcionEntrega ?? null,
                latitud: punto.latitud,
                longitud: punto.longitud,
                evidenciaImagen: punto.evidenciaImagen ?? null,
            })),
            geometria: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: Array.isArray(rutaMongo.geometria) ? rutaMongo.geometria : [],
                },
            },
        };
    }

    async actualizarEstadoRuta(
        rutaId: number,
        nuevoEstado: EstadoRuta,
        horaFinalizacionEntrega?: Date | null,
    ): Promise<void> {
        const data: Record<string, unknown> = {
            estadoRuta: nuevoEstado,
        };

        if (horaFinalizacionEntrega !== undefined) {
            data.horaFinalizacionEntrega = horaFinalizacionEntrega;
        }

        const rutaActualizada = await prisma.ruta.updateMany({
            where: {
                id: rutaId,
            },
            data,
        });

        if (rutaActualizada.count === 0) {
            throw new Error(`No existe la ruta ${rutaId} para actualizar`);
        }
    }

    async actualizarEstadoPuntos(rutaId: number, estadoEntrega: IPuntoEntrega['estadoEntrega']): Promise<void> {
        await RutaEntregaModel.updateMany(
            { rutaId },
            { $set: { 'puntosEntrega.$[].estadoEntrega': estadoEntrega } }
        );
    }

    async actualizarEstadoPunto(
        rutaId: number,
        puntoId: number,
        estadoEntrega: IPuntoEntrega['estadoEntrega'],
        evidenciaImagen?: string | null,
    ): Promise<void> {
        const actualizacion: Record<string, unknown> = {
            'puntosEntrega.$.estadoEntrega': estadoEntrega,
        };

        if (typeof evidenciaImagen === 'string' && evidenciaImagen.trim().length > 0) {
            actualizacion['puntosEntrega.$.evidenciaImagen'] = evidenciaImagen;
        }

        await RutaEntregaModel.updateOne(
            { rutaId, 'puntosEntrega.id': puntoId },
            { $set: actualizacion }
        );
    }

    async finalizarRuta(rutaId: number): Promise<void> {
        await this.actualizarEstadoRuta(rutaId, EstadoRuta.ENTREGADA, new Date());
        await this.actualizarEstadoPuntos(rutaId, 'ENTREGADO');
    }

    async cancelarRuta(rutaId: number): Promise<void> {
        await this.actualizarEstadoRuta(rutaId, EstadoRuta.CANCELADA);
    }   

}

export const rutasService = new RutasService();
import type { MapaInteractivoFunciones } from './MapaInteractivo';
import type { RutaGuardadaUI } from './guardadoRuta/botonGuardarRuta.component';

type ConfiguracionVisualizacionRutas = {
    mapa: MapaInteractivoFunciones | null;
    rutasGuardadas: RutaGuardadaUI[];
    rutaSeleccionadaId?: number | null;
    limpiarSiVacio?: boolean;
};

function esGeometriaValida(ruta: RutaGuardadaUI): boolean {
    const coordenadas = ruta.geometria?.geometry?.coordinates;
    return Array.isArray(coordenadas) && coordenadas.length > 0;
}

function obtenerClaveFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function parsearFechaFuente(fechaFuente: string): Date | null {
    const coincidenciaFechaSimple = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaFuente.trim());
    if (coincidenciaFechaSimple) {
        const anio = Number(coincidenciaFechaSimple[1]);
        const mes = Number(coincidenciaFechaSimple[2]);
        const dia = Number(coincidenciaFechaSimple[3]);
        const fechaLocal = new Date(anio, mes - 1, dia, 12, 0, 0, 0);
        return Number.isNaN(fechaLocal.getTime()) ? null : fechaLocal;
    }

    const fecha = new Date(fechaFuente);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function obtenerFechaRuta(ruta: RutaGuardadaUI): Date | null {
    const fechaFuente = ruta.fechaReparto ?? ruta.resumen.horaInicioEstimada;
    if (!fechaFuente) {
        return null;
    }

    return parsearFechaFuente(fechaFuente);
}

export function filtrarRutasPorFecha(rutas: RutaGuardadaUI[], fechaObjetivo: Date): RutaGuardadaUI[] {
    const claveObjetivo = obtenerClaveFechaLocal(fechaObjetivo);

    return rutas.filter((ruta) => {
        const fechaRuta = obtenerFechaRuta(ruta);
        if (!fechaRuta) {
            return false;
        }

        return obtenerClaveFechaLocal(fechaRuta) === claveObjetivo;
    });
}

export function filtrarRutasConGeometria(rutas: RutaGuardadaUI[]): RutaGuardadaUI[] {
    return rutas.filter(esGeometriaValida);
}

export function obtenerRutasActivasParaMapa(rutas: RutaGuardadaUI[]): RutaGuardadaUI[] {
    const rutasConGeometria = filtrarRutasConGeometria(rutas);
    const rutasEnRuta = rutasConGeometria.filter((ruta) => ruta.repartidor.estado === 'en ruta');

    return rutasEnRuta.length > 0 ? rutasEnRuta : rutasConGeometria;
}

export function visualizarRutasEnMapa({
    mapa,
    rutasGuardadas,
    rutaSeleccionadaId = null,
    limpiarSiVacio = true,
}: ConfiguracionVisualizacionRutas): void {
    if (!mapa) return;

    const rutasConGeometria = filtrarRutasConGeometria(rutasGuardadas);
    const rutasFiltradas = rutaSeleccionadaId === null
        ? rutasConGeometria
        : rutasConGeometria.filter((ruta) => ruta.rutaId === rutaSeleccionadaId);

    if (rutasFiltradas.length === 0) {
        if (limpiarSiVacio) {
            mapa.limpiarRutas();
            mapa.limpiarPuntosEntrega();
        }
        return;
    }

    mapa.pintarRutasGeoJSON(rutasFiltradas.map((ruta) => ruta.geometria));

    const puntosEntrega = rutasFiltradas.flatMap((ruta) =>
        ruta.detalleParadas.map((parada) => ({
            puntoId: parada.puntoId,
            cliente: parada.cliente,
            direccion: parada.direccion,
            latitud: parada.latitud,
            longitud: parada.longitud,
            estadoEntrega: parada.estadoEntrega,
            tipoMarcador: 'punto' as const,
        })),
    );

    const marcadoresInicioFin = rutasFiltradas.flatMap((ruta) => {
        const coordenadas = ruta.geometria.geometry.coordinates;
        if (coordenadas.length === 0) return [];

        const inicio = coordenadas[0];
        const fin = coordenadas[coordenadas.length - 1];

        const marcadorInicio = {
            puntoId: -ruta.rutaId,
            cliente: `Inicio Ruta #${ruta.rutaId}`,
            direccion: ruta.detalleParadas[0]?.direccion ?? null,
            latitud: inicio[1],
            longitud: inicio[0],
            estadoEntrega: 'En camino' as const,
            tipoMarcador: 'inicio' as const,
        };

        const marcadorFin = {
            puntoId: -100000 - ruta.rutaId,
            cliente: `Fin Ruta #${ruta.rutaId}`,
            direccion: ruta.detalleParadas[ruta.detalleParadas.length - 1]?.direccion ?? null,
            latitud: fin[1],
            longitud: fin[0],
            estadoEntrega: 'Entregado' as const,
            tipoMarcador: 'fin' as const,
        };

        return [marcadorInicio, marcadorFin];
    });

    mapa.limpiarPuntosEntrega();
    mapa.pintarPuntosEntrega([...puntosEntrega, ...marcadoresInicioFin]);
}

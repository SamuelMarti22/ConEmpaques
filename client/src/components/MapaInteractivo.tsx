import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapaInteractivo.css';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { PuntoEntrega } from '../classes/PuntoEntrega';

const env = import.meta.env
const MAPBOX_TOKEN = env.MAPBOX_TOKEN as string;
mapboxgl.accessToken = MAPBOX_TOKEN;

const coordenadasMedellin: [number, number] = [-75.5636, 6.2442];
const FUENTE_RUTAS_ID = 'rutas-geojson-source';
const CAPA_RUTAS_ID = 'rutas-geojson-layer';
const COLORES_RUTAS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#ca8a04'];

function normalizarEstadoEntrega(estado: PuntoEntregaSimple['estadoEntrega']): 'Pendiente' | 'En proceso' | 'Entregado' {
    if (estado === 'En camino') {
        return 'En proceso';
    }

    return estado;
}

function colorPorEstadoEntrega(estado: PuntoEntregaSimple['estadoEntrega']): string {
    const estadoNormalizado = normalizarEstadoEntrega(estado);

    if (estadoNormalizado === 'Pendiente') {
        return '#f59e0b';
    }

    if (estadoNormalizado === 'En proceso') {
        return '#2563eb';
    }

    return '#16a34a';
}

type GeometriaRuta = {
    type: 'Feature';
    geometry: {
        type: 'LineString';
        coordinates: number[][];
    };
};

type PuntoEntregaSimple = {
    puntoId: number;
    cliente: string | null;
    direccion: string | null;
    latitud: number;
    longitud: number;
    estadoEntrega: 'Pendiente' | 'En camino' | 'Entregado';
    tipoMarcador?: 'punto' | 'inicio' | 'fin';
};

//Funciones que expone a otros componentes, para modificar sus propios marcadores
export interface MapaInteractivoFunciones {
    agregarPunto: (punto: PuntoEntrega) => void;
    eliminarPunto: (id: number) => void;
    vaciarPuntos: () => void;
    pintarRutasGeoJSON: (rutas: GeometriaRuta[]) => void;
    limpiarRutas: () => void;
    resaltarRutaPorIndice: (indiceRuta: number | null) => void;
    pintarPuntosEntrega: (puntos: PuntoEntregaSimple[]) => void;
    limpiarPuntosEntrega: () => void;
}

const MapaInteractivo = forwardRef<MapaInteractivoFunciones>((_props, ref) => {
    const contenedorMapa = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const marcadoresRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
    const marcadoresPuntosEntregaRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
    const rutasRef = useRef<GeometriaRuta[]>([]);
    const indiceRutaResaltadaRef = useRef<number | null>(null);

    const construirFeatureCollection = useCallback((
        rutas: GeometriaRuta[],
        indiceRutaSeleccionada: number | null,
    ): GeoJSON.FeatureCollection => {
        const featuresTotales: GeoJSON.Feature[] = rutas.map((ruta, indiceOriginal) => ({
            type: 'Feature',
            geometry: ruta.geometry as unknown as GeoJSON.Geometry,
            properties: {
                color: COLORES_RUTAS[indiceOriginal % COLORES_RUTAS.length],
                indiceRuta: indiceOriginal,
            },
        }));

        const features = indiceRutaSeleccionada === null
            ? featuresTotales
            : featuresTotales.filter((feature) => {
                const propiedades = feature.properties as { indiceRuta?: number } | null;
                return propiedades?.indiceRuta === indiceRutaSeleccionada;
            });

        return {
            type: 'FeatureCollection',
            features,
        };
    }, []);

    const actualizarCapaRutas = useCallback((rutas: GeometriaRuta[]) => {
        const mapa = mapRef.current;
        if (!mapa || !mapa.isStyleLoaded()) return;

        const featureCollection = construirFeatureCollection(rutas, indiceRutaResaltadaRef.current);

        const sourceExistente = mapa.getSource(FUENTE_RUTAS_ID) as mapboxgl.GeoJSONSource | undefined;
        if (sourceExistente) {
            sourceExistente.setData(featureCollection);
            return;
        }

        mapa.addSource(FUENTE_RUTAS_ID, {
            type: 'geojson',
            data: featureCollection,
        });

        mapa.addLayer({
            id: CAPA_RUTAS_ID,
            type: 'line',
            source: FUENTE_RUTAS_ID,
            paint: {
                'line-color': ['coalesce', ['get', 'color'], '#2563eb'],
                'line-width': 4,
                'line-opacity': 0.9,
            },
        });
    }, [construirFeatureCollection]);

    useEffect(() => {
        if (!contenedorMapa.current) return;

        mapRef.current = new mapboxgl.Map({
            container: contenedorMapa.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: coordenadasMedellin,
            zoom: 12.5
        });

        mapRef.current.on('load', () => {
            actualizarCapaRutas(rutasRef.current);
        });

        return () => { mapRef.current?.remove(); };
    }, [actualizarCapaRutas]);

    useImperativeHandle(ref, () => ({
        agregarPunto: (punto: PuntoEntrega) => {
            if (!mapRef.current) return;
            const marker = new mapboxgl.Marker()
                .setLngLat([punto.getLongitud(), punto.getLatitud()])
                .setPopup(new mapboxgl.Popup().setText(punto.getCliente()))
                .addTo(mapRef.current);
            marcadoresRef.current.set(punto.getId(), marker);
        },
        eliminarPunto: (id: number) => {
            const marker = marcadoresRef.current.get(id);
            if (!marker) return;
            marker.remove();
            marcadoresRef.current.delete(id);
        },
        vaciarPuntos: () => {
            marcadoresRef.current.forEach(marker => marker.remove());
            marcadoresRef.current.clear();
        },
        pintarRutasGeoJSON: (rutas: GeometriaRuta[]) => {
            rutasRef.current = rutas.filter(
                (ruta) =>
                    !!ruta &&
                    ruta.type === 'Feature' &&
                    ruta.geometry?.type === 'LineString' &&
                    Array.isArray(ruta.geometry.coordinates) &&
                    ruta.geometry.coordinates.length > 0,
            );
            actualizarCapaRutas(rutasRef.current);
        },
        limpiarRutas: () => {
            rutasRef.current = [];
            indiceRutaResaltadaRef.current = null;
            actualizarCapaRutas([]);
        },
        resaltarRutaPorIndice: (indiceRuta: number | null) => {
            indiceRutaResaltadaRef.current = indiceRuta;
            actualizarCapaRutas(rutasRef.current);
        },
        pintarPuntosEntrega: (puntos: PuntoEntregaSimple[]) => {
            if (!mapRef.current) return;
            
            // Limpiar marcadores anteriores
            marcadoresPuntosEntregaRef.current.forEach(marker => marker.remove());
            marcadoresPuntosEntregaRef.current.clear();
            
            // Crear nuevo marcador para cada punto
            puntos.forEach((punto, indice) => {
                const esInicio = punto.tipoMarcador === 'inicio';
                const esFin = punto.tipoMarcador === 'fin';
                const colorMarcador = esInicio
                    ? '#059669'
                    : esFin
                        ? '#dc2626'
                        : colorPorEstadoEntrega(punto.estadoEntrega);
                const estadoNormalizado = normalizarEstadoEntrega(punto.estadoEntrega);
                const textoPopup = esInicio
                    ? `Inicio: ${punto.cliente || 'Ruta'}`
                    : esFin
                        ? `Fin: ${punto.cliente || 'Ruta'}`
                        : `${punto.cliente || 'Sin nombre'} (${estadoNormalizado})`;

                const popup = new mapboxgl.Popup().setText(textoPopup);
                
                const marker = new mapboxgl.Marker({ color: colorMarcador })
                    .setLngLat([punto.longitud, punto.latitud])
                    .setPopup(popup)
                    .addTo(mapRef.current!);
                
                marcadoresPuntosEntregaRef.current.set(indice, marker);
            });
        },
        limpiarPuntosEntrega: () => {
            marcadoresPuntosEntregaRef.current.forEach(marker => marker.remove());
            marcadoresPuntosEntregaRef.current.clear();
        },
    }));

    return <div ref={contenedorMapa} className="mapaInteractivo__contenedor" />;
});

export default MapaInteractivo;
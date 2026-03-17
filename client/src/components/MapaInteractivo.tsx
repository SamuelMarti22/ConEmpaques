import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { PuntoEntrega } from '../classes/PuntoEntrega';

const env = import.meta.env
const MAPBOX_TOKEN = env.MAPBOX_TOKEN as string;
mapboxgl.accessToken = MAPBOX_TOKEN;

const coordenadasMedellin: [number, number] = [-75.5636, 6.2442];

//Funciones que expone a otros componentes, para modificar sus propios marcadores
export interface MapaInteractivoFunciones {
    agregarPunto: (punto: PuntoEntrega) => void;
    eliminarPunto: (index: number) => void;
    vaciarPuntos: () => void;
}

const MapaInteractivo = forwardRef<MapaInteractivoFunciones>((_props, ref) => {
    const contenedorMapa = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const marcadoresRef = useRef<{ id: number; marker: mapboxgl.Marker }[]>([]);

    useEffect(() => {
        if (!contenedorMapa.current) return;

        mapRef.current = new mapboxgl.Map({
            container: contenedorMapa.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: coordenadasMedellin,
            zoom: 12.5
        });

        return () => { mapRef.current?.remove(); };
    }, []);

    useImperativeHandle(ref, () => ({
        agregarPunto: (punto: PuntoEntrega) => {
            if (!mapRef.current) return;
            const marker = new mapboxgl.Marker()
                .setLngLat([punto.getLongitud(), punto.getLatitud()])
                .setPopup(new mapboxgl.Popup().setText(punto.getCliente()))
                .addTo(mapRef.current);
            marcadoresRef.current.push({ id: punto.getId(), marker });
        },
        eliminarPunto: (index: number) => {
            const marcadorObj = marcadoresRef.current[index];
            if (!marcadorObj) return;
            marcadorObj.marker.remove();
            marcadoresRef.current.splice(index, 1);
        },
        vaciarPuntos: () => {
            marcadoresRef.current.forEach(marcadorObj => marcadorObj.marker.remove());
            marcadoresRef.current = [];
        }
    }));

    return <div ref={contenedorMapa} style={{ width: '100%', height: '100%' }} />;
});

export default MapaInteractivo;
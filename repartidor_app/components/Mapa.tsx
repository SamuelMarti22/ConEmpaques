import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Constants from 'expo-constants';

interface Parada {
  latitud: number;
  longitud: number;
  codigo: string;
  orden: number;
  estadoEntrega: 'Bodega' | 'Pendiente' | 'Entregado' | 'Fallido';
}

interface GeoJSONGeometria {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
  properties?: Record<string, any>;
}

interface MapaTrackingProps {
  paradas: Parada[];
  ubicacionActual?: { lat: number; lng: number };
  onMapReady?: () => void;
  geometria?: GeoJSONGeometria;
}

const ESTADO_COLORES = {
  Bodega: '#FFB81C',
  Pendiente: '#FFC107',
  Entregado: '#4CAF50',
  Fallido: '#F44336',
};


export const Mapa: React.FC<MapaTrackingProps> = ({
  paradas,
  ubicacionActual,
  onMapReady,
  geometria,
}) => {
  const mapRef = useRef<MapView>(null);

  // Calcular coordenadas para centrar el mapa
  useEffect(() => {
    if (paradas.length > 0 && mapRef.current) {
      const latitudes = paradas.map(p => p.latitud);
      const longitudes = paradas.map(p => p.longitud);
      
      const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
      const centerLng = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
      
      const deltaLat = (Math.max(...latitudes) - Math.min(...latitudes)) * 0.1;
      const deltaLng = (Math.max(...longitudes) - Math.min(...longitudes)) * 0.1;
      
      mapRef.current?.animateToRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max(deltaLat, 0.01),
        longitudeDelta: Math.max(deltaLng, 0.01),
      }, 1000);
    }
  }, [paradas]);

  // Obtener coordenadas de la ruta del GeoJSON
  const rutaCoordinates = geometria && geometria.geometry.coordinates.length > 0
    ? geometria.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0],
      }))
    : paradas.map(p => ({
        latitude: p.latitud,
        longitude: p.longitud,
      }));

  // Región inicial
  const initialRegion = paradas.length > 0
    ? {
        latitude: paradas[0].latitud,
        longitude: paradas[0].longitud,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 6.3,
        longitude: -75.5,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={onMapReady}
      >
        {/* Línea de ruta */}
        {rutaCoordinates.length > 1 && (
          <Polyline
            coordinates={rutaCoordinates}
            strokeColor="#1976D2"
            strokeWidth={4}
            lineDashPattern={[]}
          />
        )}

        {/* Markers de paradas */}
        {paradas.map((parada) => (
          <Marker
            key={parada.orden}
            coordinate={{
              latitude: parada.latitud,
              longitude: parada.longitud,
            }}
            title={parada.codigo}
            description={`Orden #${parada.orden}`}
            pinColor={ESTADO_COLORES[parada.estadoEntrega] || '#999999'}
          />
        ))}

        {/* Marker de ubicación actual */}
        {ubicacionActual && (
          <Marker
            coordinate={{
              latitude: ubicacionActual.lat,
              longitude: ubicacionActual.lng,
            }}
            title="Tu ubicación"
            pinColor="#1FC47C"
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

// Tracking.app.tsx
import React, { useState, useEffect } from 'react';
import { obtenerUbicacionActual } from '@/services/ubicacion.service';
import {
  View, Text, TouchableOpacity,
  SafeAreaView, ScrollView, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { styles } from './Tracking.style';
import { DetalleParada, RutaGuardada } from '../../types/rutas.types';
import { COLORS } from '../../assets/styles/Colores.style';
import { abrirGoogleMapsConRuta } from '@/services/RutaGoogleMaps.app';
import Feather from '@expo/vector-icons/Feather';

const C = COLORS;

const ESTADO_CFG = {
  Bodega: { bg: '#e8f4f8', text: '#1F6F5F' },
  Pendiente: { bg: '#fff3cd', text: '#856404' }, 
  Entregado: { bg: '#d1f0e4', text: '#1F6F5F' },
  Fallido:   { bg: '#fde8e8', text: '#a32d2d' },
};

interface DetalleParadaScreenProps {
  parada: DetalleParada;
  totalParadas: number;
  origenLat: number;
  origenLng: number;
  onBack: () => void;
}


// Mostrar todas las paradas en una sola vista
const ParadasListScreen = ({ paradas, onBack }: { paradas: DetalleParada[], onBack: () => void }) => {
  // Calcula distancia entre dos puntos
  const calcularDistancia = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (6371 * c).toFixed(2);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.mapContainer, { backgroundColor: '#e8f4f8', justifyContent: 'center', alignItems: 'center', position: 'relative' }]}> 
        {/* Header sobre el mapa */}
        <View style={styles.mapHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.mapTitle}>Resumen de {paradas.length} paradas </Text>
          <View style={styles.enRutaBadge}>
            <Text style={styles.enRutaText}>En ruta</Text>
          </View>
        </View>
        {/* Simulación de mapa */}
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 40 }}>🗺️</Text>
          </View>
        </View>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={{ padding: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {paradas.map((parada, idx) => {
          const estado = ESTADO_CFG[parada.estadoEntrega] ?? ESTADO_CFG.Pendiente;
          // Distancia desde la primera parada
          const origenLat = paradas[0]?.latitud ?? parada.latitud;
          const origenLng = paradas[0]?.longitud ?? parada.longitud;
          return (
            <View key={parada.orden} style={[styles.card, { marginBottom: 18 }]}> 
              {/* Código + estado */}
              <View style={styles.orderRow}>
                <View>
                  <Text style={styles.orderCode}>{parada.codigo}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.orderSub}>
                      Orden #{parada.orden} · Peso: {parada.pesoProducto} kg
                    </Text>
                    <View style={{ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fff', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: C.teal, alignSelf: 'flex-start' }}>
                      <Text style={{ fontSize: 10, color: '#666', fontWeight: '600' }}>Distancia: {calcularDistancia(origenLat, origenLng, parada.latitud, parada.longitud)} km</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}> 
                  <Text style={[styles.estadoText, { color: estado.text }]}> 
                    {parada.estadoEntrega}
                  </Text>
                </View>
              </View>
              {/* Ruta origen → destino */}
              <View style={styles.routeSection}>
                <View style={styles.routeRow}>
                  <View style={styles.routeLine}>
                    <View style={styles.dotStart} />
                    <View style={styles.routeConnector} />
                    <View style={styles.dotEnd} />
                  </View>
                  <View style={styles.routeTexts}>
                    <View>
                      <Text style={styles.routeLabel}>Ubicación actual</Text>
                      <Text style={styles.routeValue}>Punto de inicio de ruta</Text>
                    </View>
                    <View>
                      <Text style={[styles.routeLabel, { color: C.primary }]}>Destino</Text>
                      <Text style={styles.routeValue}>{parada.direccion}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {/* Info grid */}
              <View style={styles.infoSection}>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Cliente</Text>
                    <Text style={styles.infoValue}>{parada.cliente}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Contacto</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.infoValue}>{parada.contactoCliente}</Text>
                      {/* Bolita verde y teléfono juntos */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#1FC47C', marginRight: 4 }} />
                        <TouchableOpacity
                          style={[
                            styles.callBtn,
                            {
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              paddingVertical: 0,
                              paddingHorizontal: 0,
                              justifyContent: 'center',
                              alignItems: 'center',
                            },
                          ]}
                          onPress={() => {
                            const tel = `tel:${parada.contactoCliente}`;
                            Linking.canOpenURL(tel)
                              .then((ok) => ok ? Linking.openURL(tel) : Alert.alert('No se puede llamar'))
                              .catch(() => Alert.alert('Error al abrir teléfono'));
                          }}
                        >
                          <Feather name="phone" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.infoItem, styles.infoFull]}>
                    <Text style={styles.infoLabel}>Indicaciones</Text>
                    <Text style={[styles.infoValue, { fontWeight: '400', fontSize: 13 }]}> 
                      {parada.descripcionEntrega}
                    </Text>
                  </View>
                </View>
                {/* Botón de Entregado debajo de Indicaciones*/}
                <View style={{ marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: C.teal, borderRadius: 8, paddingVertical: 12, width: '100%' }}
                    onPress={() => {
                      console.log('Entregado:', parada.orden);
                      Alert.alert('Entregado', `ID/Orden: ${parada.orden}`);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Entregado</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Pantalla Principal de Tracking ────────────────────────────────────────────
export default function TrackingScreen() {
  const { rutaId } = useLocalSearchParams<{ rutaId: string }>();
  const router = useRouter();
  const [ruta, setRuta] = useState<RutaGuardada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paradaSeleccionada, setParadaSeleccionada] = useState<number | null>(null);
  // Los hooks deben ir aquí, fuera de cualquier if
  const [ubicacionActual, setUbicacionActual] = useState<{ lat: number, lng: number } | null>(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  useEffect(() => {
    const cargarDetalleRuta = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!rutaId) {
          throw new Error('No se proporcionó ID de ruta');
        }

        console.log('Cargando detalles para ruta ID:', rutaId);

        const response = await fetch(
          `http://192.168.1.11:3000/api/rutas/${rutaId}`
          
        );
      
        const data = await response.json();
  

        if (!response.ok) {
          throw new Error(data?.message ?? 'Error al cargar la ruta');
        }

        // Acceder a detalleRuta dentro de la respuesta
        const rutaData = data.detalleRuta || data;
        console.log('Datos de ruta procesados:', rutaData);
        console.log('Detalles de paradas:', rutaData.detalleParadas?.length);
        setRuta(rutaData);
        // Mostrar la primera parada por defecto
        if (rutaData.detalleParadas && rutaData.detalleParadas.length > 0) {
          console.log('Inicializando con parada 0');
          setParadaSeleccionada(0);
        } else {
          console.log('No hay paradas disponibles');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    cargarDetalleRuta();
  }, [rutaId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>...
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={{ marginTop: 12, color: '#666' }}>Cargando ruta...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !ruta) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Text style={{ color: '#d32f2f', fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
            {error || 'No se pudo cargar la ruta'}
          </Text>
          <Text style={{ color: '#999', fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
            ID de ruta: {rutaId}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 20, padding: 10, backgroundColor: C.teal, borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#fff' }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Debug: Log del estado actual
  console.log('Estado actual:', { ruta: !!ruta, paradaSeleccionada, detallesCount: ruta?.detalleParadas?.length });

  if (ruta && ruta.detalleParadas && ruta.detalleParadas.length > 0) {
    const coordenadasTracking = ruta.detalleParadas.map((p) => ({ lat: p.latitud, lng: p.longitud }));

    return (
      <>
        {/* Botón de Iniciar Ruta */}
        <SafeAreaView style={{ backgroundColor: '#fff' }}>
          <View style={{ padding: 16, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <TouchableOpacity
              style={{ backgroundColor: C.primary, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 10 }}
              disabled={obteniendoUbicacion}
              onPress={async () => {
                setObteniendoUbicacion(true);
                try {
                  const ubicacion = await obtenerUbicacionActual();
                  setUbicacionActual(ubicacion);
                  const puntoFinal = { lat: 6.3000, lng: -75.5700 }; // Cambia estas coords si quieres
                  const coordenadasConInicioYFinal = [ubicacion, ...coordenadasTracking, puntoFinal];
                  abrirGoogleMapsConRuta(coordenadasConInicioYFinal);
                } catch (err: any) {
                  Alert.alert('Error', err.message || 'No se pudo obtener la ubicación');
                } finally {
                  setObteniendoUbicacion(false);
                }
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>
                {obteniendoUbicacion ? 'Obteniendo ubicación...' : 'Iniciar ruta'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        {/* Lista de paradas */}
        <ParadasListScreen paradas={ruta.detalleParadas} onBack={() => router.back()} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: '#666', fontSize: 16, marginBottom: 12 }}>No hay paradas para mostrar</Text>
        <Text style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>
          Detalles: {ruta ? `${ruta.detalleParadas?.length ?? 0} paradas` : 'Sin ruta'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 10, backgroundColor: C.teal, borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

import { abrirGoogleMapsConRuta } from '@/services/RutaGoogleMaps.app';
import { socketService } from '@/services/socket.service';
import { obtenerUbicacionActual, obtenerUbicacionEnTiempoReal } from '@/services/ubicacion.service';
import Feather from '@expo/vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView, ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../../assets/styles/Colores.style';
import { DetalleParada, RutaGuardada } from '../../types/rutas.types';
import { styles } from './Tracking.style';
import Constants from "expo-constants";

const C = COLORS;

const ESTADO_CFG = {
  EN_BODEGA: { bg: '#e8f4f8', text: '#1F6F5F' },
  PENDIENTE: { bg: '#fff3cd', text: '#856404' }, 
  EN_ENTREGA: { bg: '#fff0e0', text: '#d97706' },
  EN_CAMINO: { bg: '#e3f2fd', text: '#1565c0' },
  ENTREGADO: { bg: '#d1f0e4', text: '#1F6F5F' },
  FALLIDO:   { bg: '#fde8e8', text: '#a32d2d' },
};

const guardarSesion = async (rutaId: number, idRepartidor: number) => {
  try {
    await AsyncStorage.setItem('tracking_session', JSON.stringify({
      rutaId,
      idRepartidor,
      timestamp: Date.now(),
    }));
    console.log('✅ Sesión guardada en AsyncStorage');
  } catch (error) {
    console.error('❌ Error guardando sesión:', error);
  }
};

const obtenerSesion = async () => {
  try {
    const session = await AsyncStorage.getItem('tracking_session');
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('❌ Error recuperando sesión:', error);
    return null;
  }
};

const limpiarSesion = async () => {
  try {
    await AsyncStorage.removeItem('tracking_session');
    console.log('✅ Sesión eliminada');
  } catch (error) {
    console.error('❌ Error limpiando sesión:', error);
  }
};

interface DetalleParadaScreenProps {
  parada: DetalleParada;
  totalParadas: number;
  origenLat: number;
  origenLng: number;
  onBack: () => void;
}


// Mostrar todas las paradas en una sola vista
const ParadasListScreen = ({ 
  paradas, 
  onBack,
  geometria,
  onIniciarRuta,
  obteniendoUbicacion,
  trackingActivo,
  rutaId,
}: { 
  paradas: DetalleParada[], 
  onBack: () => void,
  geometria?: any,
  onIniciarRuta?: () => void,
  obteniendoUbicacion?: boolean,
  trackingActivo?: boolean,
  rutaId?: string | number,
}) => {
  const apiBaseUrl = Constants.expoConfig?.extra?.API_URL || "http://localhost:3000";

  // Calcula distancia entre dos puntos
  const calcularDistancia = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (6371 * c).toFixed(2);
  };

  const actualizarSiguientePuntoEnEntrega = async (indiceActual: number) => {
    const siguienteParada = paradas[indiceActual + 1];

    if (!siguienteParada) {
      return;
    }

    if (!siguienteParada.puntoId || !Number.isInteger(siguienteParada.puntoId) || siguienteParada.puntoId <= 0) {
      throw new Error(`No se pudo obtener un punto válido para la siguiente parada (orden ${siguienteParada.orden})`);
    }

    const response = await fetch(
      `${apiBaseUrl}/api/rutas/${rutaId}/actualizarPunto`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puntoId: Number(siguienteParada.puntoId),
          nuevoEstado: 'EN_ENTREGA',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Error al actualizar el siguiente punto a EN_ENTREGA');
    }
  };

  // Función para actualizar el estado de un punto
  const actualizarEstadoPunto = async (puntoId: number, nuevoEstado: 'ENTREGADO' | 'FALLIDO', indiceActual: number) => {
    try {
      // Validar puntoId
      if (!puntoId || !Number.isInteger(puntoId) || puntoId <= 0) {
        console.error('❌ puntoId inválido:', { puntoId, type: typeof puntoId });
        Alert.alert('Error', `ID de punto inválido: ${puntoId} (tipo: ${typeof puntoId})`);
        return;
      }

      if (!rutaId) {
        Alert.alert('Error', 'No se pudo obtener el ID de la ruta');
        return;
      }

      console.log('📤 Enviando actualización:', { rutaId, puntoId, nuevoEstado });

      const response = await fetch(
        `${apiBaseUrl}/api/rutas/${rutaId}/actualizarPunto`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            puntoId: Number(puntoId),
            nuevoEstado,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Error al actualizar el estado');
      }

      await actualizarSiguientePuntoEnEntrega(indiceActual);

      Alert.alert('Éxito', `Punto actualizado a ${nuevoEstado}`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', mensaje);
      console.error('Error al actualizar estado:', error);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.mapContainer, { position: 'relative' }]}> 
        {/* Mapa de Mapbox
        <Mapa 
          paradas={paradas.map(p => ({
            latitud: p.latitud,
            longitud: p.longitud,
            codigo: p.codigo,
            orden: p.orden,
            estadoEntrega: p.estadoEntrega,
          }))}
          geometria={geometria}
        /> */}
        
        {/* Header sobre el mapa */}
        <View style={styles.mapHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.mapTitle}>Resumen de {paradas.length} paradas </Text>
          {/* Botón Iniciar Ruta en lugar del badge */}
          {onIniciarRuta && (
            <TouchableOpacity
              style={{ 
                backgroundColor: '#FF6B35', 
                borderRadius: 8, 
                paddingVertical: 8, 
                paddingHorizontal: 14,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              disabled={obteniendoUbicacion || trackingActivo}
              onPress={onIniciarRuta}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                {obteniendoUbicacion ? '⏳' : trackingActivo ? '✓' : '▶️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={{ padding: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {paradas.map((parada, idx) => {
          const estado = ESTADO_CFG[parada.estadoEntrega as keyof typeof ESTADO_CFG] ?? ESTADO_CFG.PENDIENTE;
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
                {/* Botones de Entregado y Fallido */}
                <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: C.teal, borderRadius: 8, paddingVertical: 12 }}
                    onPress={() => {
                      console.log('🔍 Parada:', parada);
                      actualizarEstadoPunto(parada.puntoId, 'ENTREGADO', idx);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>✓ Entregado</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#d32f2f', borderRadius: 8, paddingVertical: 12 }}
                    onPress={() => {
                      console.log('🔍 Parada:', parada);
                      actualizarEstadoPunto(parada.puntoId, 'FALLIDO', idx);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>✗ Fallido</Text>
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
  
  // Estados para tracking
  const [trackingActivo, setTrackingActivo] = useState(false);
  const [idRepartidor, setIdRepartidor] = useState<number | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [ultimoHito, setUltimoHito] = useState<string | null>(null);

  const apiBaseUrl = Constants.expoConfig?.extra?.API_URL || "http://localhost:3000";

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
          `${apiBaseUrl}/api/rutas/${rutaId}`
          
        );
      
        const data = await response.json();
  

        if (!response.ok) {
          throw new Error(data?.message ?? 'Error al cargar la ruta');
        }

        // Acceder a detalleRuta dentro de la respuesta
        const rutaData = data.detalleRuta || data;
        setRuta(rutaData);
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

  // 🔄 Verificar y reconectar sesión activa
  useEffect(() => {
    const verificarYReconectar = async () => {
      try {
        const sesion = await obtenerSesion();
        
        if (sesion && ruta) {
          console.log('🔄 Sesión activa encontrada:', sesion);
          
          // Reconectar automáticamente
          await socketService.connect();
          console.log('✅ Socket reconectado automáticamente');
          
          // Restaurar estado
          setIdRepartidor(sesion.idRepartidor);
          setTrackingActivo(true);
          
          // Configurar event listeners
          socketService.onLocationUpdate((locationData) => {
            console.log('📍 Ubicación actualizada:', locationData);
          });

          socketService.onOrderMilestone((milestoneData) => {
            console.log('🎯 Hito alcanzado:', milestoneData);
            setUltimoHito(milestoneData.hito);
            Alert.alert('¡Notificación!', `Falta ${milestoneData.hito} para la siguiente parada`);
          });

          socketService.onDriverFinished(() => {
            console.log('🏁 Ruta finalizada desde el servidor');
            limpiarSesion();
            setTrackingActivo(false);
          });

          socketService.onError((errorData) => {
            console.error('❌ Error del socket:', errorData);
            Alert.alert('Error', 'Error en la conexión del socket');
          });
          
          // Emitir driver:start con puntos
          const puntos = ruta.detalleParadas.map(p => p.codigo);
          socketService.iniciarRuta(sesion.idRepartidor, puntos, sesion.rutaId);
          
          console.log('✅ Tracking restaurado correctamente');
        }
      } catch (error) {
        console.error('❌ Error al verificar sesión:', error);
      }
    };

    if (ruta && !trackingActivo) {
      verificarYReconectar();
    }
  }, [ruta]);

  // Limpiar socket cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (trackingActivo) {
        socketService.disconnect();
      }
    };
  }, [trackingActivo]);

  // Enviar ubicación cada 10 segundos cuando tracking está activo
  useEffect(() => {
    if (!trackingActivo) return;

    console.log('📍 Iniciando envío de ubicación cada 10 segundos');

    const intervaloUbicacion = setInterval(async () => {
      try {
        const ubicacion = await obtenerUbicacionEnTiempoReal();
        console.log(`📤 Enviando ubicación: ${ubicacion.lat}, ${ubicacion.lng}`);
        socketService.enviarUbicacion(ubicacion.lat, ubicacion.lng);
      } catch (error) {
        console.error('❌ Error al obtener ubicación:', error);
      }
    }, 10000); // 10 segundos

    return () => {
      console.log('🛑 Deteniendo envío de ubicación');
      clearInterval(intervaloUbicacion);
    };
  }, [trackingActivo]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
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
        {/* Lista de paradas */}
        <ParadasListScreen 
          paradas={ruta.detalleParadas} 
          onBack={() => router.back()}
          geometria={ruta.geometria}
          rutaId={rutaId}
          onIniciarRuta={async () => {
            setObteniendoUbicacion(true);
            try {
              // 1️⃣ Iniciar tracking en el servidor
              console.log('🚀 Iniciando tracking para ruta:', rutaId);
              
              const url = `${apiBaseUrl}/api/tracking/iniciar/${rutaId}`;
              console.log('📍 URL del endpoint:', url);
              
              const responseTracking = await fetch(url, { method: 'POST' });
              console.log('📦 Response status:', responseTracking.status);

              const trackingData = await responseTracking.json();
              console.log('📦 Response data:', trackingData);

              if (!responseTracking.ok) {
                const errorData = trackingData;
                throw new Error(errorData.error || 'Error al iniciar tracking');
              }

              const { data } = trackingData;
              const { idRepartidor: repId, room: roomName } = data;

              console.log('✅ Tracking iniciado:', { repId, roomName });
              Alert.alert('DEBUG', `Room: ${roomName}\nRepartidor: ${repId}`);

              // 2️⃣ Conectar socket
              console.log('🔌 Conectando socket...');
              await socketService.connect();
              console.log('✅ Socket listo para emitir eventos');

              // 3️⃣ Escuchar eventos del servidor
              socketService.onLocationUpdate((locationData) => {
                console.log('📍 Ubicación actualizada:', locationData);
              });

              socketService.onOrderMilestone((milestoneData) => {
                console.log('🎯 Hito alcanzado:', milestoneData);
                setUltimoHito(milestoneData.hito);
                Alert.alert('¡Notificación!', `Falta ${milestoneData.hito} para la siguiente parada`);
              });

              socketService.onDriverFinished(() => {
                console.log('🏁 Ruta finalizada desde el servidor');
                Alert.alert('Ruta finalizada', 'La jornada ha terminado');
                limpiarSesion();
                setTrackingActivo(false);
              });

              socketService.onError((errorData) => {
                console.error('❌ Error del socket:', errorData);
                Alert.alert('Error', 'Error en la conexión del socket');
              });

              // 4️⃣ Emitir driver:start
              console.log('📤 Preparando driver:start...');
              const puntos = ruta.detalleParadas.map(p => p.codigo);
              console.log('📤 Puntos:', puntos);
              socketService.iniciarRuta(repId, puntos, Number(rutaId));

              // 5️⃣ Guardar datos del tracking
              setIdRepartidor(repId);
              setRoom(roomName);
              setTrackingActivo(true);
              
              // 💾 Guardar sesión para reconexión
              await guardarSesion(Number(rutaId), repId);

              // 6️⃣ Obtener ubicación y abrir Google Maps
              const ubicacion = await obtenerUbicacionActual();
              setUbicacionActual(ubicacion);
              const puntoFinal = { lat: 6.3000, lng: -75.5700 };
              const coordenadasConInicioYFinal = [ubicacion, ...ruta.detalleParadas.map((p) => ({ lat: p.latitud, lng: p.longitud })), puntoFinal];
              abrirGoogleMapsConRuta(coordenadasConInicioYFinal);

              Alert.alert('¡Éxito!', 'Tracking iniciado correctamente');
            } catch (err: any) {
              console.error('❌ Error completo:', err);
              console.error('❌ Mensaje:', err.message);
              Alert.alert('Error', err.message || 'No se pudo iniciar el tracking');
              setTrackingActivo(false);
              await limpiarSesion();
            } finally {
              setObteniendoUbicacion(false);
            }
          }}
          obteniendoUbicacion={obteniendoUbicacion}
          trackingActivo={trackingActivo}
        />
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

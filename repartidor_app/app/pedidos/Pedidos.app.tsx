import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/pedidos/Header.component';
import RutaInfoCard from '../../components/pedidos/RutaInfoCard.component';
import { styles } from './Pedidos.style';
import { COLORS } from '../../assets/styles/Colores.style';
import { RutaResumen } from '../../types/rutas.types';
import Constants from "expo-constants";

export default function PedidosScreen() {
  const router = useRouter();
  const [idRepartidor, setIdRepartidor] = useState<number | null>(null);
  const [rutas, setRutas] = useState<RutaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar el ID del repartidor al montar el componente
  useEffect(() => {
    const cargarIdRepartidor = async () => {
      try {
        const id = await AsyncStorage.getItem("idRepartidor");
        if (id) {
          setIdRepartidor(parseInt(id, 10));
          console.log("✅ ID del repartidor cargado:", id);
        } else {
          setError("No se encontró el ID del repartidor. Por favor, inicia sesión nuevamente.");
        }
      } catch (err) {
        setError("Error al cargar el ID del repartidor");
        console.error(err);
      }
    };
    cargarIdRepartidor();
  }, []);

  const consultarRutas = useCallback(async (isRefresh = false) => {
    if (!idRepartidor) {
      setError("ID del repartidor no disponible");
      return;
    }

    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const apiBaseUrl = Constants.expoConfig?.extra?.API_URL || "http://localhost:3000";
      console.log('📡 Consultando rutas en url:', apiBaseUrl);

      const response = await fetch(
        `${apiBaseUrl}/api/rutas/repartidor/${idRepartidor}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? 'Error al consultar rutas');
      }

      const rutasNormalizadas: RutaResumen[] = Array.isArray(data?.detalleParadas)
        ? data.detalleParadas.map((ruta: any) => {
          console.log(ruta.estadoRuta);

          const estadoNormalizado = String(ruta.estadoRuta || 'PENDIENTE').trim().toUpperCase();
          console.log('Estado normalizado:', estadoNormalizado);
          let estadoFinal = 'pendiente';

          if (estadoNormalizado === 'EN_PROCESO') {
            estadoFinal = 'en_proceso';
          } else if (estadoNormalizado === 'ENTREGADA') {
            estadoFinal = 'entregada';
          } else if (estadoNormalizado === 'CANCELADA') {
            estadoFinal = 'cancelada';
          }else{
            estadoFinal = estadoNormalizado.toLowerCase();
          }

          return {
            id: ruta.id,
            dia: '',
            fecha: ruta.fechaReparto,
            estadoRuta: estadoNormalizado,
            estado: estadoFinal,
            cantidadPuntos: ruta.cantidadPuntos,
            tiempoPromedio: ruta.tiempoEstimado?.toString() || '0',
            distancia: ruta.distanciaTotal,
          };
        })
        : [];

      setRutas(rutasNormalizadas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setRutas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [idRepartidor]);

  useEffect(() => {
    if (idRepartidor) {
      consultarRutas();
    }
  }, [idRepartidor, consultarRutas]);

  useFocusEffect(
    useCallback(() => {
      if (idRepartidor) {
        consultarRutas(true);
      }
    }, [idRepartidor, consultarRutas])
  );

  const formatearFecha = (fecha: string): string => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const obtenerDia = (fecha: string): string => {
    const date = new Date(fecha);
    const dia = date.toLocaleDateString('es-ES', {
      weekday: 'long',
    });
    return dia.charAt(0).toUpperCase() + dia.slice(1);
  };

  const formatearTiempo = (segundos: number | null): string => {
    if (!segundos) return 'Sin estimar';
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas === 0) return `${minutos}min`;
    return `${horas}h ${minutos}min`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Cargando rutas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header
        title="Mis rutas"
        subtitle={`${rutas.length} ruta${rutas.length !== 1 ? 's' : ''} encontrada${rutas.length !== 1 ? 's' : ''
          }`}
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => consultarRutas()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rutas}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => consultarRutas(true)}
              tintColor={COLORS.teal}
              colors={[COLORS.teal]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No tienes rutas aún</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RutaInfoCard
              id={item.id}
              dia={obtenerDia(item.fecha)}
              fecha={formatearFecha(item.fecha)}
              estadoRuta={item.estadoRuta}
              estado={item.estado}
              cantidadPuntos={item.cantidadPuntos}
              tiempoPromedio={formatearTiempo(parseInt(item.tiempoPromedio, 10))}
              distancia={item.distancia}
              onVerDetalles={() => {
                router.push({
                  pathname: '../tracking/Tracking.app',
                  params: { rutaId: item.id },
                });
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

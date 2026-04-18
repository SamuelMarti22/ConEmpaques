import * as Location from 'expo-location';

/**
 * Obtiene la ubicación actual del usuario (lat, lng).
 * Lanza error si no hay permisos o falla la obtención.
 */
export const obtenerUbicacionActual = async (): Promise<{ lat: number; lng: number }> => {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }
  const location = await Location.getCurrentPositionAsync({});
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
};

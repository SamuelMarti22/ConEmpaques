import { Linking } from 'react-native'



/**
 * Abre Google Maps con una ruta desde los puntos de pedidos y un punto de finalización opcional.
 * @param pedidos Array de puntos intermedios (paradas)
 * @param puntoFinal Opcional, punto de finalización extra {lat, lng}
 */
export const abrirGoogleMapsConRuta = async (
  pedidos: Array<{lat: number, lng: number}>,
  puntoFinal?: {lat: number, lng: number}
) => {
  if (!pedidos || pedidos.length < 2) {
    alert('Se requieren al menos dos puntos para la ruta.');
    return;
  }
  const origen = pedidos[0];
  let destino = pedidos[pedidos.length - 1];
  let intermedios = pedidos.slice(1, -1);

  console.log('Origen:', origen);
  console.log('Destino:', destino);
  console.log('Intermedios:', intermedios);
  // Si hay punto de finalización, lo usamos como destino y el anterior destino pasa a intermedios
  if (puntoFinal) {
    intermedios = [...intermedios, destino];
    destino = puntoFinal;
  }

  const waypoints = intermedios.map(p => `${p.lat},${p.lng}`).join('|');

  let urlWeb = `https://www.google.com/maps/dir/?api=1`;
  urlWeb += `&origin=${origen.lat},${origen.lng}`;
  urlWeb += `&destination=${destino.lat},${destino.lng}`;
  if (waypoints) urlWeb += `&waypoints=${waypoints}`;
  urlWeb += `&travelmode=driving`;

  Linking.openURL(urlWeb);
}
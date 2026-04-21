import { Server } from 'socket.io';
import { trackingStore } from '../../store/storeTracking.service.js';

type Coordenada = { lat: number; lng: number };

type SimulacionEnCurso = {
  rutaId: number;
  idRepartidor: number;
  room: string;
  indiceActual: number;
  totalPuntos: number;
  intervaloMs: number;
  activoDesde: number;
};

type IniciarSimulacionInput = {
  io: Server;
  rutaId: number;
  idRepartidor: number;
  room: string;
  coordenadas: Coordenada[];
  intervaloMs: number;
};

const INDICE_INICIAL = 0;

class TrackingSimulationService {
  private readonly intervalos = new Map<number, NodeJS.Timeout>();
  private readonly estados = new Map<number, SimulacionEnCurso>();

  iniciarSimulacion({ io, rutaId, idRepartidor, room, coordenadas, intervaloMs }: IniciarSimulacionInput) {
    if (coordenadas.length === 0) {
      throw new Error('No hay coordenadas para simular la ruta');
    }

    this.detenerSimulacion(rutaId);

    const estado: SimulacionEnCurso = {
      rutaId,
      idRepartidor,
      room,
      indiceActual: INDICE_INICIAL,
      totalPuntos: coordenadas.length,
      intervaloMs,
      activoDesde: Date.now(),
    };

    const emitirPosicion = () => {
      const coordenada = coordenadas[estado.indiceActual];
      if (!coordenada) {
        return;
      }

      const timestamp = Date.now();
      const puntosRestantes = Math.max(coordenadas.length - estado.indiceActual - 1, 0);
      const eta = Math.floor((puntosRestantes * intervaloMs) / 1000);

      trackingStore.agregarPosicion(rutaId, {
        lat: coordenada.lat,
        lng: coordenada.lng,
        timestamp,
        simulado: true,
      });

      io.to(room).emit('location:update', {
        lat: coordenada.lat,
        lng: coordenada.lng,
        eta,
        timestamp,
        idRuta: rutaId,
        idRepartidor,
        simulado: true,
      });

      estado.indiceActual = estado.indiceActual + 1;
      if (estado.indiceActual >= coordenadas.length) {
        estado.indiceActual = INDICE_INICIAL;
      }

      this.estados.set(rutaId, estado);
    };

    emitirPosicion();

    const intervalo = setInterval(emitirPosicion, intervaloMs);
    this.intervalos.set(rutaId, intervalo);
    this.estados.set(rutaId, estado);

    return this.obtenerEstado(rutaId);
  }

  detenerSimulacion(rutaId: number) {
    const intervalo = this.intervalos.get(rutaId);
    if (intervalo) {
      clearInterval(intervalo);
      this.intervalos.delete(rutaId);
    }

    const estado = this.estados.get(rutaId) ?? null;
    this.estados.delete(rutaId);

    return estado;
  }

  obtenerEstado(rutaId: number) {
    const estado = this.estados.get(rutaId);
    if (!estado) {
      return null;
    }

    return {
      ...estado,
      activo: this.intervalos.has(rutaId),
    };
  }
}

export const trackingSimulationService = new TrackingSimulationService();

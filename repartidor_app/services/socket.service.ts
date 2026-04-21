import { io, Socket } from 'socket.io-client';
import Constants from "expo-constants";

const apiBaseUrl = Constants.expoConfig?.extra?.API_URL || "http://localhost:3000";

const SOCKET_URL = `${apiBaseUrl}`;

class SocketService {
  private socket: Socket | null = null;

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('✅ Socket ya estaba conectado');
        resolve(this.socket);
        return;
      }

      this.socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket conectado:', this.socket?.id);
        resolve(this.socket!);
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket desconectado');
      });

      this.socket.on('error', (error) => {
        console.error('❌ Error de socket:', error);
        reject(error);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error);
        reject(error);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Emitir evento driver:start
  iniciarRuta(idRepartidor: number, puntos: string[], idRuta: number): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket no conectado');
      return;
    }
    console.log('📤 Emitiendo driver:start:', { idRepartidor, puntos, idRuta });
    this.socket.emit('driver:start', { idRepartidor, puntos, idRuta });
    console.log('✅ Evento driver:start emitido');
  }

  // Emitir ubicación
  enviarUbicacion(lat: number, lng: number, eta?: number): void {
    if (!this.socket?.connected) {
      console.error('Socket no conectado');
      return;
    }
    this.socket.emit('driver:location', { lat, lng, eta });
    console.log(`📍 Ubicación enviada: ${lat}, ${lng}`);
  }

  // Terminar ruta
  terminarRuta(idRuta: number): void {
    if (!this.socket?.connected) {
      console.error('Socket no conectado');
      return;
    }
    this.socket.emit('driver:finish', { idRuta });
    console.log('🏁 Ruta terminada');
  }

  // Escuchar actualizaciones de ubicación
  onLocationUpdate(callback: (data: any) => void): void {
    if (!this.socket) return;
    this.socket.on('location:update', callback);
  }

  // Escuchar hitos (notificaciones de proximidad)
  onOrderMilestone(callback: (data: any) => void): void {
    if (!this.socket) return;
    this.socket.on('order:milestone', callback);
  }

  // Escuchar cuando ruta finaliza
  onDriverFinished(callback: () => void): void {
    if (!this.socket) return;
    this.socket.on('driver:finished', callback);
  }

  // Escuchar errores del servidor
  onError(callback: (data: any) => void): void {
    if (!this.socket) return;
    this.socket.on('error', callback);
  }

  // Dejar de escuchar un evento
  offLocationUpdate(): void {
    this.socket?.off('location:update');
  }

  offOrderMilestone(): void {
    this.socket?.off('order:milestone');
  }

  offDriverFinished(): void {
    this.socket?.off('driver:finished');
  }
  offError(): void {
    this.socket?.off('error');
  }}

export const socketService = new SocketService();

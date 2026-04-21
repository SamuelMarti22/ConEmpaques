// socket/handlers.ts
import { Server, Socket } from 'socket.io'
import { trackingStore } from '../store/storeTracking.service'
import { obtenerRoom } from './rooms.service'

export const registerHandlers = (io: Server, socket: Socket) => {

    // Repartidor inicia jornada
    socket.on('driver:start', async ({ idRepartidor, puntos, idRuta }: { idRepartidor: number, puntos: string[], idRuta: number }) => {
        try {
            trackingStore.crearSession(idRepartidor, puntos, idRuta)
            const room = await obtenerRoom(idRuta)
            socket.join(room)
            socket.data.idRepartidor = idRepartidor
            socket.data.idRuta = idRuta  // guardamos también para usarlo en driver:location

            console.log(`Repartidor ${idRepartidor} inició jornada con ${puntos.length} pedidos`)
        } catch (error) {
            console.error('Error en driver:start:', error)
            socket.emit('error', { mensaje: 'Error al iniciar tracking' })
        }
    })

    // Repartidor envía ubicación
    socket.on('driver:location', async ({ lat, lng, eta }: { lat: number, lng: number, eta?: number }) => {
        try {
            const idRepartidor = socket.data.idRepartidor
            const idRuta = socket.data.idRuta
            
            if (!idRepartidor || !idRuta) {
                console.warn('⚠️  Ubicación recibida pero sin idRepartidor o idRuta');
                socket.emit('error', { 
                    codigo: 'FALTA_REPARTIDOR_RUTA',
                    mensaje: 'No se encontró repartidor o ruta. Debes iniciar sesión primero con driver:start' 
                });
                return
            }

            const position = { lat, lng, timestamp: Date.now() }
            trackingStore.agregarPosicion(idRuta, position)

            console.log(`📍 Ubicación recibida - Repartidor ${idRepartidor}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)

            const room = await obtenerRoom(idRuta)

            // Broadcast a todos en la room (clientes + repartidor)
            io.to(room).emit('location:update', {
                lat,
                lng,
                eta,
                timestamp: position.timestamp,
                idRuta,
                idRepartidor,
            })

            // Evaluar hitos para notificaciones
            if (eta && eta <= 120) {
                console.log(`🎯 ¡Hito! Repartidor ${idRepartidor} a 2 minutos de parada`);
                io.to(room).emit('order:milestone', { hito: '2min' })
            } else if (eta && eta <= 600) {
                console.log(`🎯 ¡Hito! Repartidor ${idRepartidor} a 10 minutos de parada`);
                io.to(room).emit('order:milestone', { hito: '10min' })
            }
        } catch (error) {
            console.error('❌ Error en driver:location:', error)
        }
    })

    // Cliente se une a la room de su repartidor
    socket.on('client:join', async ({ idRepartidor, puntos }: { idRepartidor: string, puntos: string }) => {
        try {
            const room = await obtenerRoom(idRepartidor)
            socket.join(room)
            socket.data.puntos = puntos
            socket.data.idRepartidor = idRepartidor

            // Le mandamos la última posición conocida inmediatamente
            const lastPosition = trackingStore.obtenerUltimaPosicion(idRepartidor)
            if (lastPosition) {
                socket.emit('location:update', lastPosition)
            }

            console.log(`Cliente unido a room del repartidor ${idRepartidor}`)
        } catch (error) {
            console.error('Error en client:join:', error)
            socket.emit('error', { mensaje: 'Error al unirse a la ruta' })
        }
    })

    // Repartidor termina jornada
    socket.on('driver:finish', async ({ idRuta }: { idRuta: string | number }) => {
        try {
            const idRepartidor = socket.data.idRepartidor
            const room = await obtenerRoom(idRuta)
            trackingStore.eliminarSession(idRuta)
            io.to(room).emit('driver:finished')
            console.log(`Repartidor ${idRepartidor} terminó su jornada`)
        } catch (error) {
            console.error('Error en driver:finish:', error)
            socket.emit('error', { mensaje: 'Error al finalizar tracking' })
        }
    })

    // Manejo de desconexión
    socket.on('disconnect', () => {
        const idRepartidor = socket.data.idRepartidor
        if (idRepartidor) {
            console.log(`Repartidor ${idRepartidor} desconectado - sesión en memoria intacta`)
        }
    })
}

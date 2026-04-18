import { Server } from 'socket.io'
import { prisma } from '../databases/prisma/lib/prisma.js'

export const obtenerRoom = (idRepartidor: string) => `repartidor:${idRepartidor}`

export const entrarRepartidorRoom = (io: Server, socketId: string, room: string) => {
  const socket = io.sockets.sockets.get(socketId)
  if (!socket) return
  socket.join(obtenerRoom(room))
}

export const abandonarRepartidorRoom = (io: Server, socketId: string, room: string) => {
  const socket = io.sockets.sockets.get(socketId)
  if (!socket) return
  socket.leave(obtenerRoom(room))
}
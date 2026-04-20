import { Server } from 'socket.io'
import { prisma } from '../databases/prisma/lib/prisma.js'

export const obtenerRoom = async (idRuta: string | number) => {
  const ruta = await prisma.ruta.findUnique({
    where: { id: Number(idRuta) },
    select: { room: true }
  })
  
  if (!ruta || !ruta.room) {
    throw new Error(`No se encontró la room para la ruta con ID: ${idRuta}`)
  }
  
  return ruta.room
}

export const entrarARoom = async (io: Server, socketId: string, idRuta: string | number) => {
  const socket = io.sockets.sockets.get(socketId)
  if (!socket) return
  const roomName = await obtenerRoom(idRuta)
  socket.join(roomName)
}

export const abandonarRoom = async (io: Server, socketId: string, idRuta: string | number) => {
  const socket = io.sockets.sockets.get(socketId)
  if (!socket) return
  const roomName = await obtenerRoom(idRuta)
  socket.leave(roomName)
}
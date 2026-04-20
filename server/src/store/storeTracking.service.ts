import { Posicion, DriverSession } from "../types/store.types";
import { prisma } from "../databases/prisma/lib/prisma.js";
const sessions = new Map<string, DriverSession>()

export const trackingStore = {

    crearSession(idRepartidor: number, puntos: string[], idRuta: number) {
        sessions.set(String(idRuta), {
            idRepartidor,
            puntos,
            posiciones: []
        })
    },

    obtenerUltimaPosicion(idRuta: string | number): Posicion | null {
        const session = sessions.get(String(idRuta))
        if (!session || session.posiciones.length === 0) return null
        return session.posiciones[0] || null
    },

    obtenerSession(idRuta: string | number): DriverSession | null {
        return sessions.get(String(idRuta)) ?? null
    },

    eliminarSession(idRuta: string | number) {
        sessions.delete(String(idRuta))
    },


  // Guardar nueva posición, máximo 3
  agregarPosicion(idRepartidor: string, posicion: Posicion) {
    const session = sessions.get(idRepartidor)
    if (!session) return

    session.posiciones.unshift(posicion)          
    session.posiciones = session.posiciones.slice(0, 3)  
  },
}
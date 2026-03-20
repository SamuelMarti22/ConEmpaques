import type { IPuntoEntrega, IRutaEntrega } from '../../databases/mongoDB/schema';
import { RutaRepartidorGeoJSON } from '../../types/routing.types';
import { prisma } from "../../databases/prisma/lib/prisma.js";
import { RutaEntregaModel } from '../../databases/mongoDB/models/rutaEntrega.model.js';


export class RutasService {
    async guardarRuta(puntosEntrega: IPuntoEntrega[], rutasRepartidorGeoJSON: RutaRepartidorGeoJSON[], fechaReparto: Date): Promise<string> {

        const puntosEntregaDiccionario = this.construirDiccionarioPuntosEntrega(puntosEntrega);

        console.log("Que llego al service", puntosEntregaDiccionario, rutasRepartidorGeoJSON, fechaReparto);
        console.log("Longitud de rutasRepartidorGeoJSON:", rutasRepartidorGeoJSON.length);

        try {
            while (rutasRepartidorGeoJSON.length != 0) {
                const ruta = rutasRepartidorGeoJSON.pop();

                if (!ruta || !ruta.repartidor_id) {
                    continue;
                }

                // Guardar la ruta en MySQL usando Prisma
                const idRutaGuardada = await prisma.ruta.create({
                    data: {
                        repartidorId: ruta.repartidor_id,
                        fechaReparto: fechaReparto,
                        estadoRuta: 'PENDIENTE',
                        horaInicioEntrega: null,
                        horaFinalizacionEntrega: null,
                    }
                });

                // Transformar los puntos de entrega de la ruta al formato esperado por MongoDB
                const puntosTransformados = ruta.ruta.map(punto =>
                    this.construirPuntosEntrega(puntosEntregaDiccionario[punto]!)
                );
                console.log("Puntos transformados:", puntosTransformados);

                // Guardar la ruta de entrega en MongoDB
                const rutaEntrega = await RutaEntregaModel.create({
                    rutaId: idRutaGuardada.id,
                    puntosEntrega: puntosTransformados
                });
                console.log("RutaEntrega guardada en MongoDB:", rutaEntrega);
            }

            return "Rutas guardadas correctamente";
        } catch (error) {
            console.error("Error en guardarRuta:", error);
            throw error;
        }
    }

    construirPuntosEntrega(punto: any): IPuntoEntrega {
        return {
            id: punto.id,
            nombreCliente: punto.nombreCliente,
            codigo: punto.codigo,
            contactoCliente: punto.contactoCliente,
            latitud: punto.latitud,
            longitud: punto.longitud,
            pesoProducto: punto.pesoProducto,
            descripcionEntrega: punto.descripcionEntrega,
            direccion: punto.direccion,
            estadoEntrega: 'PENDIENTE'
        }
    }

    construirDiccionarioPuntosEntrega(puntos: IPuntoEntrega[]): Record<string, IPuntoEntrega> {
        return puntos.reduce((acc, punto) => {
            acc[punto.id] = punto;
            return acc;
        }, {} as Record<string, IPuntoEntrega>);
    }

}

export const rutasService = new RutasService();
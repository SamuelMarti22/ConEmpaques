import { config } from "dotenv";
import { connectMongo } from "./conection.js";
import { RutaEntregaModel } from "./models/rutaEntrega.model.js";

config({ path: "../../.env" });

async function main() {
  await connectMongo();

  // Crear una ruta de entrega de prueba
  const ruta = await RutaEntregaModel.create({
    rutaId: 1,
    puntosEntrega: [
      {
        nombreCliente: "Carlos Pérez",
        codigo: "PE-001",
        contactoCliente: "3001234567",
        latitud: 4.711,
        longitud: -74.0721,
        cantidadProducto: 3,
        descripcionProducto: "Cajas medianas",
        estadoEntrega: "PENDIENTE",
      },
      {
        nombreCliente: "Ana Gómez",
        codigo: "PE-002",
        contactoCliente: "3019876543",
        latitud: 4.6097,
        longitud: -74.0817,
        cantidadProducto: 5,
        descripcionProducto: "Bolsas grandes",
        estadoEntrega: "PENDIENTE",
      },
    ],
  });

  // getNombreCliente es un método de PuntoEntrega, no de RutaEntrega
  const primerPunto = ruta.getPuntoEntregaByCodigo("0")
  console.log(primerPunto?.getNombreCliente())

  console.log("Created Mongo user:", ruta);

  const rutas = await RutaEntregaModel.find();
  console.log("All Mongo users:", rutas);
}

main();
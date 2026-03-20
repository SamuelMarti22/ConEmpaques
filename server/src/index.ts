import cors from "cors";
import express from "express";
import env from "./config/env.js";
import { prisma } from "./databases/prisma/lib/prisma.js";
import { horarioController } from "./modules/horarios/horario.controller.js";
import { repartidorController } from "./modules/repartidores/repartidor.controller.js";
import { routingController } from "./modules/routing/routing.controller.js";
import { rutasController } from "./modules/rutas/rutas.controller.js";
import geoCodificacionRutasController from "./modules/geoCodificacion/geoCodificacion.controller.js";


const app = express();
app.use(express.json());
app.use(cors());

// Rutas repartidor
app.get("/api/repartidores", repartidorController.obtenerTodos);
app.get("/api/repartidores/disponibles-hoy", repartidorController.obtenerDisponiblesHoy);
app.post("/api/repartidores/:id/validar-recepcion-ruta", horarioController.validarRecepcionRuta);
app.get("/api/repartidores/:id", repartidorController.obtenerPorId);
app.post("/api/repartidores", repartidorController.crear);
app.put("/api/repartidores/:id", repartidorController.actualizar);
app.patch("/api/repartidores/:id", repartidorController.actualizar);
app.delete("/api/repartidores/:id", repartidorController.eliminar);

// Rutas horarios repartidor
app.get("/api/repartidores/:id/horarios", horarioController.obtenerHorarios);
app.post("/api/repartidores/:id/horarios", horarioController.crearHorario);
app.put("/api/repartidores/:id/horarios/:horarioId", horarioController.actualizarHorario);
app.patch("/api/repartidores/:id/horarios/:horarioId", horarioController.actualizarHorario);
app.delete("/api/repartidores/:id/horarios/:horarioId", horarioController.eliminarHorario);

// Rutas para optimización de rutas
app.post("/api/routing/optimizar", routingController.getRutaOptima);


// Rutas para CRUD rutas
app.post("/api/rutas/guardar", rutasController.guardarRutas);

// Alias para mantener compatibilidad entre frontend y backend
app.use("/api/geocodificacion", geoCodificacionRutasController);
app.use("/api/geocoding", geoCodificacionRutasController);


const iniciar = async () => {
	await prisma.$connect();

	const puerto = Number(env.PORT ?? 3000);
	app.listen(puerto, () => {
		console.log(`Server running on http://localhost:${puerto}`);
	});
};

void iniciar();

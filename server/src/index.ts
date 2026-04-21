import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import env from "./config/env.js";
import { prisma } from "./databases/prisma/lib/prisma.js";
import { connectMongo } from "./databases/mongoDB/conection.js";
import { horarioController } from "./modules/horarios/horario.controller.js";
import { repartidorController } from "./modules/repartidores/repartidor.controller.js";
import { routingController } from "./modules/routing/routing.controller.js";
import { rutasController } from "./modules/rutas/rutas.controller.js";
import { TrackingController } from "./modules/tracking/tracking.controller.js";
import { clienteController } from "./modules/vistaCliente/cliente.controller.js";
import geoCodificacionRutasController from "./modules/geoCodificacion/geoCodificacion.controller.js";
import { rutasService } from "./modules/rutas/rutas.service.js";
import { registerHandlers } from "./sockets/handle.js";
import { setSocketServer } from "./sockets/io.gateway.js";
import { authController } from "./modules/autenticacion/auth.controller.js";


const app = express();
const INTERVALO_DEPURACION_RUTAS_MS = 12 * 60 * 60 * 1000;
const DIAS_RETENCION_RUTAS = 30;
app.use(express.json());
app.use(cors());

// Rutas autenticacion
app.post("/api/auth/logistico", authController.loginLogistico);
app.post("/api/auth/repartidor", authController.loginRepartidor);
app.post("/api/auth/cliente", authController.loginCliente);

// Rutas repartidor
app.get("/api/repartidores", repartidorController.obtenerTodos);
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
app.get("/api/rutas", rutasController.obtenerRutasGuardadas);
app.post("/api/rutas/guardar", rutasController.guardarRutas);
app.delete("/api/rutas/:rutaId", rutasController.eliminarRuta);
app.get("/api/rutas/repartidor/:idRepartidor", rutasController.consultarRutasRepartidor);
app.get("/api/rutas/:rutaId", rutasController.consultarDetalleRuta);
app.post("/api/rutas/:rutaId/finalizar", rutasController.finalizarRuta);
app.post("/api/rutas/:rutaId/cancelar", rutasController.cancelarRuta);
app.post("/api/rutas/:rutaId/actualizarPunto", rutasController.actualizarEstadoPunto);

// Rutas para tracking
const trackingController = new TrackingController();
app.post("/api/tracking/iniciar/:rutaId", (req, res) => trackingController.iniciarTrackingRuta(req, res));
app.get("/api/tracking/ubicacion/:rutaId", (req, res) => trackingController.obtenerUbicacionRepartidor(req, res));
app.post("/api/tracking/simulacion/iniciar/:rutaId", (req, res) => trackingController.iniciarSimulacionRuta(req, res));
app.post("/api/tracking/simulacion/detener/:rutaId", (req, res) => trackingController.detenerSimulacionRuta(req, res));
app.get("/api/tracking/simulacion/estado/:rutaId", (req, res) => trackingController.estadoSimulacionRuta(req, res));


// Ruta vista cliente
app.get("/api/clientes/pedidos/:id", clienteController.getPuntoEntrega);

// Alias para mantener compatibilidad entre frontend y backend
app.use("/api/geocodificacion", geoCodificacionRutasController);
app.use("/api/geocoding", geoCodificacionRutasController);


const iniciar = async () => {
	await prisma.$connect();
	await connectMongo();

	// Crear servidor HTTP para Socket.io
	const server = createServer(app);
	
	// Inicializar Socket.io
	const io = new Server(server, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"]
		}
	});

	setSocketServer(io);

	// Registrar handlers de Socket.io
	io.on("connection", (socket) => {
		console.log(`✅ Cliente conectado: ${socket.id}`);
		registerHandlers(io, socket);
		
		socket.on("disconnect", () => {
			console.log(`❌ Cliente desconectado: ${socket.id}`);
		});
	});

	const ejecutarDepuracionRutas = async () => {
		try {
			const resultado = await rutasService.depurarRutasAntiguas(DIAS_RETENCION_RUTAS);
			if (resultado.rutasEliminadas > 0 || resultado.documentosMongoEliminados > 0) {
				console.log(
					`Depuracion rutas +30 dias: MySQL=${resultado.rutasEliminadas}, Mongo=${resultado.documentosMongoEliminados}`,
				);
			}
		} catch (error) {
			console.error('Error durante depuracion automatica de rutas:', error);
		}
	};

	void ejecutarDepuracionRutas();
	setInterval(() => {
		void ejecutarDepuracionRutas();
	}, INTERVALO_DEPURACION_RUTAS_MS);

	const puerto = Number(env.PORT ?? 3000);
	server.listen(puerto, () => {
		console.log(`🚀 Server running on http://localhost:${puerto}`);
		console.log(`📡 Socket.io listening on ws://localhost:${puerto}`);
	});
};

void iniciar();

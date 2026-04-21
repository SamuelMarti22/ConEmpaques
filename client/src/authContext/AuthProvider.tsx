import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AuthContext, type Usuario } from "./AuthContext";
import {
	notificarCambioAPrimerTramoEntrega,
	solicitarPermisoNotificacionesSiHaceFalta,
} from "../components/notificacionCliente/notificacionCliente.component";

const STORAGE_TOKEN_KEY = "conempaques.auth.token";
const STORAGE_USUARIO_KEY = "conempaques.auth.usuario";

interface AuthProviderProps {
	children: ReactNode;
}

interface PuntoEntregaClienteResponse {
	id: number;
	nombreCliente: string;
	codigo: string;
	estadoEntrega: 'EN_BODEGA' | 'PENDIENTE' | 'EN_ENTREGA' | 'EN_CAMINO' | 'ENTREGADO' | 'FALLIDO';
}

interface ObtenerPedidoClienteResponse {
	rutaId: number;
	puntoEntrega: PuntoEntregaClienteResponse;
	error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const CLIENTE_POLLING_INTERVAL_MS = 30_000;

function leerTokenInicial(): string | null {
	return localStorage.getItem(STORAGE_TOKEN_KEY);
}

function leerUsuarioInicial(): Usuario | null {
	const usuarioGuardado = localStorage.getItem(STORAGE_USUARIO_KEY);

	if (!usuarioGuardado) {
		return null;
	}

	try {
		return JSON.parse(usuarioGuardado) as Usuario;
	} catch {
		localStorage.removeItem(STORAGE_USUARIO_KEY);
		return null;
	}
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const [token, setToken] = useState<string | null>(() => leerTokenInicial());
	const [usuario, setUsuario] = useState<Usuario | null>(() => leerUsuarioInicial());
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const estadoEntregaClienteRef = useRef<Usuario["estadoEntrega"] | undefined>(leerUsuarioInicial()?.estadoEntrega);

	const consultarPedidoCliente = useCallback(async (codigoNormalizado: string): Promise<ObtenerPedidoClienteResponse> => {
		const respuesta = await fetch(`${API_BASE_URL}/api/clientes/pedidos/${encodeURIComponent(codigoNormalizado)}`);
		const payload = (await respuesta.json().catch(() => null)) as ObtenerPedidoClienteResponse | null;

		if (!respuesta.ok) {
			throw new Error(payload?.error ?? "No se pudo validar el código de entrega");
		}

		if (!payload?.puntoEntrega) {
			throw new Error("Respuesta inválida del servidor al consultar el pedido");
		}

		return payload;
	}, []);

	const logout = useCallback(() => {
		setToken(null);
		setUsuario(null);
		setError(null);
		estadoEntregaClienteRef.current = undefined;

		localStorage.removeItem(STORAGE_TOKEN_KEY);
		localStorage.removeItem(STORAGE_USUARIO_KEY);
	}, []);

	const loginLogistico = useCallback(async (email: string, password: string) => {
		setCargando(true);
		setError(null);

		try {
			if (email.trim().length === 0 || password.trim().length === 0) {
				throw new Error("Debes enviar email y contraseña");
			}

			// Ejemplo temporal mientras se implementa endpoint real de login.
			const nuevoToken = `demo-token-${Date.now()}`;
			const nuevoUsuario: Usuario = {
				id: 1,
				nombre: email.split("@")[0] || "usuario",
				rol: "logistico",
			};

			setToken(nuevoToken);
			setUsuario(nuevoUsuario);
			estadoEntregaClienteRef.current = nuevoUsuario.estadoEntrega;

			localStorage.setItem(STORAGE_TOKEN_KEY, nuevoToken);
			localStorage.setItem(STORAGE_USUARIO_KEY, JSON.stringify(nuevoUsuario));
		} catch (errorLogin) {
			const mensaje = errorLogin instanceof Error ? errorLogin.message : "No se pudo iniciar sesión";
			setError(mensaje);
			throw errorLogin;
		} finally {
			setCargando(false);
		}
	}, []);

	const loginCliente = useCallback(async (codigoEntrega: string) => {
		setCargando(true);
		setError(null);

		try {
			const codigoNormalizado = codigoEntrega.trim().toUpperCase();

			if (codigoNormalizado.length === 0) {
				throw new Error("Debes enviar un código de entrega válido");
			}

			const payload = await consultarPedidoCliente(codigoNormalizado);

			const nuevoToken = `cliente-token-${Date.now()}`;
			const nuevoUsuario: Usuario = {
				id: payload.puntoEntrega.id,
				nombre: payload.puntoEntrega.nombreCliente || "cliente",
				codigoEntrega: payload.puntoEntrega.codigo,
				rutaId: payload.rutaId,
				estadoEntrega: payload.puntoEntrega.estadoEntrega,
				rol: "cliente",
			};

			setToken(nuevoToken);
			setUsuario(nuevoUsuario);
			estadoEntregaClienteRef.current = nuevoUsuario.estadoEntrega;

			localStorage.setItem(STORAGE_TOKEN_KEY, nuevoToken);
			localStorage.setItem(STORAGE_USUARIO_KEY, JSON.stringify(nuevoUsuario));
		} catch (errorLogin) {
			const mensaje = errorLogin instanceof Error ? errorLogin.message : "No se pudo iniciar sesión";
			setError(mensaje);
			throw errorLogin;
		} finally {
			setCargando(false);
		}
	}, [consultarPedidoCliente]);

	useEffect(() => {
		if (usuario?.rol !== "cliente" || !usuario.codigoEntrega) {
			return;
		}

		solicitarPermisoNotificacionesSiHaceFalta();

		const codigoNormalizado = usuario.codigoEntrega.trim().toUpperCase();
		if (codigoNormalizado.length === 0) {
			return;
		}

		let cancelado = false;

		const refrescarEstadoCliente = async () => {
			try {
				const payload = await consultarPedidoCliente(codigoNormalizado);
				if (cancelado) {
					return;
				}

				const estadoAnterior = estadoEntregaClienteRef.current;
				estadoEntregaClienteRef.current = payload.puntoEntrega.estadoEntrega;

				setUsuario((usuarioActual) => {
					if (!usuarioActual || usuarioActual.rol !== "cliente") {
						return usuarioActual;
					}

					const usuarioActualizado: Usuario = {
						...usuarioActual,
						id: payload.puntoEntrega.id,
						nombre: payload.puntoEntrega.nombreCliente || usuarioActual.nombre || "cliente",
						codigoEntrega: payload.puntoEntrega.codigo,
						rutaId: payload.rutaId,
						estadoEntrega: payload.puntoEntrega.estadoEntrega,
						rol: "cliente",
					};

					localStorage.setItem(STORAGE_USUARIO_KEY, JSON.stringify(usuarioActualizado));
					return usuarioActualizado;
				});

				notificarCambioAPrimerTramoEntrega({
					estadoAnterior,
					estadoNuevo: payload.puntoEntrega.estadoEntrega,
					codigoEntrega: payload.puntoEntrega.codigo,
					nombreCliente: payload.puntoEntrega.nombreCliente,
				});
			} catch (errorActualizacion) {
				console.error("No se pudo refrescar el estado del pedido del cliente:", errorActualizacion);
			}
		};

		void refrescarEstadoCliente();
		const intervalId = window.setInterval(() => {
			void refrescarEstadoCliente();
		}, CLIENTE_POLLING_INTERVAL_MS);

		return () => {
			cancelado = true;
			window.clearInterval(intervalId);
		};
	}, [usuario?.rol, usuario?.codigoEntrega, consultarPedidoCliente]);

	const value = useMemo(
		() => ({
			usuario,
			token,
			isAuthenticated: Boolean(token && usuario),
			cargando,
			error,
			loginLogistico,
			loginCliente,
			logout,
		}),
		[usuario, token, cargando, error, loginLogistico, loginCliente, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

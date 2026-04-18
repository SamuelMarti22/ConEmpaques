import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AuthContext, type Usuario } from "./AuthContext";

const STORAGE_TOKEN_KEY = "conempaques.auth.token";
const STORAGE_USUARIO_KEY = "conempaques.auth.usuario";

interface AuthProviderProps {
	children: ReactNode;
}

interface PuntoEntregaClienteResponse {
	id: number;
	nombreCliente: string;
	codigo: string;
	estadoEntrega: 'EN_BODEGA' | 'PENDIENTE' | 'EN_CAMINO' | 'ENTREGADO' | 'FALLIDO';
}

interface ObtenerPedidoClienteResponse {
	rutaId: number;
	puntoEntrega: PuntoEntregaClienteResponse;
	error?: string;
}

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

	const logout = useCallback(() => {
		setToken(null);
		setUsuario(null);
		setError(null);

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

			const respuesta = await fetch(`http://localhost:3000/api/clientes/pedidos/${encodeURIComponent(codigoNormalizado)}`);
			const payload = (await respuesta.json().catch(() => null)) as ObtenerPedidoClienteResponse | null;

			if (!respuesta.ok) {
				throw new Error(payload?.error ?? "No se pudo validar el código de entrega");
			}

			if (!payload?.puntoEntrega) {
				throw new Error("Respuesta inválida del servidor al consultar el pedido");
			}

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

import type { ReactNode } from "react";
import { useAuth, type Usuario } from "./AuthContext";

interface ProtectedRouteProps {
	children: ReactNode;
	allowedRoles?: Usuario["rol"][];
	fallback?: ReactNode;
}

export default function ProtectedRoute({ children, allowedRoles, fallback }: ProtectedRouteProps) {
	const { isAuthenticated, cargando, usuario } = useAuth();

	if (cargando) {
		return <div>Cargando sesión...</div>;
	}

	if (!isAuthenticated || !usuario) {
		return <>{fallback ?? <div>Debes iniciar sesión para acceder a esta sección.</div>}</>;
	}

	if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
		return <div>No tienes permisos para acceder a esta sección.</div>;
	}

	return <>{children}</>;
}

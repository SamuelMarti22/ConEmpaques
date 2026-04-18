import { createContext, useContext } from "react";

export interface Usuario {
    id: number;
    nombre?: string;
    codigoEntrega?: string;
    rutaId?: number;
    estadoEntrega?: 'EN_BODEGA' | 'PENDIENTE' | 'EN_CAMINO' | 'ENTREGADO' | 'FALLIDO';
    rol: 'logistico' | 'cliente';
}

export interface AuthContextValue {
    usuario: Usuario | null;
    token: string | null;
    isAuthenticated: boolean;
    cargando: boolean;
    error: string | null;
    loginLogistico: (email: string, password: string) => Promise<void>;
    loginCliente: (codigoEntrega: string) => Promise<void>;
    logout: () => void;
}

const defaultAuthContextValue: AuthContextValue = {
    usuario: null,
    token: null,
    isAuthenticated: false,
    cargando: false,
    error: null,
    async loginLogistico() {
        throw new Error("AuthProvider no configurado");
    },
    async loginCliente() {
        throw new Error("AuthProvider no configurado");
    },
    logout() {
        throw new Error("AuthProvider no configurado");
    },
};

export const AuthContext = createContext<AuthContextValue>(defaultAuthContextValue);

export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}
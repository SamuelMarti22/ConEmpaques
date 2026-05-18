const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** Respuesta de GET /dashboard/recent  */
export interface EntregaRecienteItem {
  id: string;
  codigoSeguimiento: string;
  cliente: string;
  direccion: string;
  estado: string;
  repartidor: string;
  fechaEntrega?: string;
  distancia?: number;
  horaEntrega?: string;
}

export interface RecentDeliveriesResponse {
  entregas: EntregaRecienteItem[];
  total: number;
  pagina: number;
  porPagina: number;
}

interface OpcionesFetch {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  cuerpo?: unknown;
}

async function peticionAPI<T>(ruta: string, opciones: OpcionesFetch = {}): Promise<T> {
  const { metodo = 'GET', cuerpo } = opciones;

  const configuracion: RequestInit = {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (cuerpo) {
    configuracion.body = JSON.stringify(cuerpo);
  }

  try {
    const respuesta = await fetch(`${API_BASE_URL}${ruta}`, configuracion);

    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(error.error || `Error HTTP ${respuesta.status}`);
    }

    return (await respuesta.json()) as T;
  } catch (error) {
    console.error(`Error en petición a ${ruta}:`, error);
    throw error;
  }
}

export const dashboardAPI = {
  async obtenerEntregasRecientes(pagina: number = 1, porPagina: number = 10): Promise<RecentDeliveriesResponse> {
    return peticionAPI<RecentDeliveriesResponse>(`/dashboard/recent?pagina=${pagina}&porPagina=${porPagina}`);
  },
};

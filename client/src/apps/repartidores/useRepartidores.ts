import { useCallback, useEffect, useState } from "react";
import { URL_REPARTIDORES, obtenerMensajeErrorHttp } from "../estilosCompartidosRepartidores/repartidores.compartido";

export interface Repartidor {
  id: number;
  nombre: string;
  email: string;
  capacidadVehiculo: number;
  rol: "REPARTIDOR";
  createdAt: string;
}

export interface DatosCrearRepartidorRequest {
  nombre: string;
  email: string;
  password: string;
  capacidadVehiculo: number;
}

export interface DatosActualizarRepartidorRequest {
  nombre?: string;
  email?: string;
  password?: string;
  capacidadVehiculo?: number;
}

interface RespuestaRepartidor {
  data: Repartidor;
}

function ordenarPorId(repartidores: Repartidor[]): Repartidor[] {
  return [...repartidores].sort((a, b) => a.id - b.id);
}

export function useRepartidores() {
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cargarRepartidores = useCallback(async (): Promise<void> => {
    setCargando(true);

    try {
      const response = await fetch(URL_REPARTIDORES);
      if (!response.ok) {
        throw new Error(await obtenerMensajeErrorHttp(response));
      }

      const datos = (await response.json()) as Repartidor[];
      setRepartidores(ordenarPorId(datos));
      setError(null);
    } catch (errorPeticion) {
      setError(errorPeticion instanceof Error ? errorPeticion.message : "No se pudieron cargar los repartidores");
    } finally {
      setCargando(false);
    }
  }, []);

  const crearRepartidor = useCallback(async (datosCrear: DatosCrearRepartidorRequest): Promise<Repartidor> => {
    setProcesando(true);

    try {
      const response = await fetch(URL_REPARTIDORES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosCrear),
      });

      if (!response.ok) {
        throw new Error(await obtenerMensajeErrorHttp(response));
      }

      const payload = (await response.json()) as RespuestaRepartidor;
      const repartidorCreado = payload.data;

      setRepartidores((repartidoresActuales) => ordenarPorId([...repartidoresActuales, repartidorCreado]));
      setError(null);
      return repartidorCreado;
    } finally {
      setProcesando(false);
    }
  }, []);

  const actualizarRepartidor = useCallback(
    async (repartidorId: number, datosActualizar: DatosActualizarRepartidorRequest): Promise<Repartidor> => {
      setProcesando(true);

      try {
        const response = await fetch(`${URL_REPARTIDORES}/${repartidorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosActualizar),
        });

        if (!response.ok) {
          throw new Error(await obtenerMensajeErrorHttp(response));
        }

        const payload = (await response.json()) as RespuestaRepartidor;
        const repartidorActualizado = payload.data;

        setRepartidores((repartidoresActuales) =>
          ordenarPorId(
            repartidoresActuales.map((repartidor) =>
              repartidor.id === repartidorId ? repartidorActualizado : repartidor,
            ),
          ),
        );
        setError(null);

        return repartidorActualizado;
      } finally {
        setProcesando(false);
      }
    },
    [],
  );

  const eliminarRepartidor = useCallback(async (repartidorId: number): Promise<void> => {
    setProcesando(true);

    try {
      const response = await fetch(`${URL_REPARTIDORES}/${repartidorId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await obtenerMensajeErrorHttp(response));
      }

      setRepartidores((repartidoresActuales) => repartidoresActuales.filter((repartidor) => repartidor.id !== repartidorId));
      setError(null);
    } finally {
      setProcesando(false);
    }
  }, []);

  useEffect(() => {
    void cargarRepartidores();
  }, [cargarRepartidores]);

  return {
    repartidores,
    cargando,
    procesando,
    error,
    cargarRepartidores,
    crearRepartidor,
    actualizarRepartidor,
    eliminarRepartidor,
  };
}
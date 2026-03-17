import { useCallback, useState } from "react";
import { URL_REPARTIDORES, obtenerMensajeErrorHttp } from "../estilosCompartidosRepartidores/repartidores.compartido";

export interface HorarioRepartidor {
  id: number;
  usuarioId: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface DatosCrearHorarioRepartidorRequest {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface DatosActualizarHorarioRepartidorRequest {
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
  activo?: boolean;
}

interface RespuestaHorario {
  data: HorarioRepartidor;
}

function ordenarHorarios(horarios: HorarioRepartidor[]): HorarioRepartidor[] {
  return [...horarios].sort((a, b) => {
    if (a.diaSemana !== b.diaSemana) {
      return a.diaSemana - b.diaSemana;
    }

    if (a.horaInicio !== b.horaInicio) {
      return a.horaInicio.localeCompare(b.horaInicio);
    }

    return a.id - b.id;
  });
}

export function useHorariosRepartidor() {
  const [horarios, setHorarios] = useState<HorarioRepartidor[]>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState<boolean>(false);
  const [procesandoHorarios, setProcesandoHorarios] = useState<boolean>(false);
  const [errorHorarios, setErrorHorarios] = useState<string | null>(null);

  const cargarHorarios = useCallback(async (repartidorId: number): Promise<void> => {
    setCargandoHorarios(true);

    try {
      const response = await fetch(`${URL_REPARTIDORES}/${repartidorId}/horarios`);

      if (!response.ok) {
        throw new Error(await obtenerMensajeErrorHttp(response));
      }

      const horariosCargados = (await response.json()) as HorarioRepartidor[];
      setHorarios(ordenarHorarios(horariosCargados));
      setErrorHorarios(null);
    } catch (errorOperacion) {
      setErrorHorarios(errorOperacion instanceof Error ? errorOperacion.message : "No se pudieron cargar los horarios");
      throw errorOperacion;
    } finally {
      setCargandoHorarios(false);
    }
  }, []);

  const crearHorario = useCallback(
    async (repartidorId: number, datosCrear: DatosCrearHorarioRepartidorRequest): Promise<HorarioRepartidor> => {
      setProcesandoHorarios(true);

      try {
        const response = await fetch(`${URL_REPARTIDORES}/${repartidorId}/horarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosCrear),
        });

        if (!response.ok) {
          throw new Error(await obtenerMensajeErrorHttp(response));
        }

        const payload = (await response.json()) as RespuestaHorario;
        setHorarios((horariosActuales) => ordenarHorarios([...horariosActuales, payload.data]));
        setErrorHorarios(null);

        return payload.data;
      } finally {
        setProcesandoHorarios(false);
      }
    },
    [],
  );

  const actualizarHorario = useCallback(
    async (
      repartidorId: number,
      horarioId: number,
      datosActualizar: DatosActualizarHorarioRepartidorRequest,
    ): Promise<HorarioRepartidor> => {
      setProcesandoHorarios(true);

      try {
        const response = await fetch(`${URL_REPARTIDORES}/${repartidorId}/horarios/${horarioId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosActualizar),
        });

        if (!response.ok) {
          throw new Error(await obtenerMensajeErrorHttp(response));
        }

        const payload = (await response.json()) as RespuestaHorario;
        setHorarios((horariosActuales) =>
          ordenarHorarios(horariosActuales.map((horario) => (horario.id === horarioId ? payload.data : horario))),
        );
        setErrorHorarios(null);

        return payload.data;
      } finally {
        setProcesandoHorarios(false);
      }
    },
    [],
  );

  const eliminarHorario = useCallback(async (repartidorId: number, horarioId: number): Promise<void> => {
    setProcesandoHorarios(true);

    try {
      const response = await fetch(`${URL_REPARTIDORES}/${repartidorId}/horarios/${horarioId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await obtenerMensajeErrorHttp(response));
      }

      setHorarios((horariosActuales) => horariosActuales.filter((horario) => horario.id !== horarioId));
      setErrorHorarios(null);
    } finally {
      setProcesandoHorarios(false);
    }
  }, []);

  const limpiarHorarios = useCallback((): void => {
    setHorarios([]);
    setErrorHorarios(null);
    setCargandoHorarios(false);
    setProcesandoHorarios(false);
  }, []);

  return {
    horarios,
    cargandoHorarios,
    procesandoHorarios,
    errorHorarios,
    cargarHorarios,
    crearHorario,
    actualizarHorario,
    eliminarHorario,
    limpiarHorarios,
  };
}

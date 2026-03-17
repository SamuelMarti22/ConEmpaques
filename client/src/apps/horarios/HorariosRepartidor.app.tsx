import { useEffect } from "react";
import Swal from "sweetalert2";
import "./HorariosRepartidor.app.css";
import { obtenerMensajeErrorOperacion } from "../estilosCompartidosRepartidores/repartidores.compartido";
import type { Repartidor } from "../repartidores/useRepartidores";
import {
  type DatosCrearHorarioRepartidorRequest,
  useHorariosRepartidor,
} from "./useHorariosRepartidor";

const NOMBRES_DIA_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface HorariosRepartidorAppProps {
  repartidor: Repartidor;
  onVolver: () => void;
}

function seSolapan(horaInicioA: string, horaFinA: string, horaInicioB: string, horaFinB: string): boolean {
  return horaInicioA < horaFinB && horaInicioB < horaFinA;
}

export default function HorariosRepartidorApp({ repartidor, onVolver }: HorariosRepartidorAppProps) {
  const {
    horarios,
    cargandoHorarios,
    procesandoHorarios,
    errorHorarios,
    cargarHorarios,
    crearHorario,
    actualizarHorario,
    eliminarHorario,
    limpiarHorarios,
  } = useHorariosRepartidor();

  useEffect(() => {
    const ejecutarCarga = async (): Promise<void> => {
      try {
        await cargarHorarios(repartidor.id);
      } catch (errorOperacion) {
        await Swal.fire({
          icon: "error",
          title: "No se pudieron cargar horarios",
          text: obtenerMensajeErrorOperacion(errorOperacion),
        });
        onVolver();
      }
    };

    void ejecutarCarga();

    return () => {
      limpiarHorarios();
    };
  }, [cargarHorarios, limpiarHorarios, onVolver, repartidor.id]);

  const agregarHorario = async (): Promise<void> => {
    const { value, isConfirmed } = await Swal.fire<DatosCrearHorarioRepartidorRequest>({
      title: `Nuevo horario para ${repartidor.nombre}`,
      html: `
        <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
          <label style="font-size:0.9rem;font-weight:600">Día de la semana</label>
          <select id="swal-dia" class="swal2-input" style="margin:0">
            <option value="1">Lunes</option>
            <option value="2">Martes</option>
            <option value="3">Miércoles</option>
            <option value="4">Jueves</option>
            <option value="5">Viernes</option>
            <option value="6">Sábado</option>
            <option value="0">Domingo</option>
          </select>
          <label style="font-size:0.9rem;font-weight:600">Hora inicio</label>
          <input id="swal-hora-inicio" class="swal2-input" type="time" value="08:00" style="margin:0">
          <label style="font-size:0.9rem;font-weight:600">Hora fin</label>
          <input id="swal-hora-fin" class="swal2-input" type="time" value="17:00" style="margin:0">
          <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;margin-top:4px">
            <input id="swal-activo" type="checkbox" checked>
            Horario activo
          </label>
        </div>
      `,
      confirmButtonText: "Guardar horario",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const diaSemana = Number((document.getElementById("swal-dia") as HTMLSelectElement).value);
        const horaInicio = (document.getElementById("swal-hora-inicio") as HTMLInputElement).value.trim();
        const horaFin = (document.getElementById("swal-hora-fin") as HTMLInputElement).value.trim();
        const activo = (document.getElementById("swal-activo") as HTMLInputElement).checked;

        if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
          Swal.showValidationMessage("Selecciona un día de semana válido");
          return false;
        }

        if (!horaInicio || !horaFin) {
          Swal.showValidationMessage("Las horas de inicio y fin son obligatorias");
          return false;
        }

        if (horaInicio >= horaFin) {
          Swal.showValidationMessage("La hora de inicio debe ser menor que la hora de fin");
          return false;
        }

        const existeSolapamiento = horarios.some(
          (horario) =>
            horario.diaSemana === diaSemana && seSolapan(horaInicio, horaFin, horario.horaInicio, horario.horaFin),
        );

        if (existeSolapamiento) {
          Swal.showValidationMessage("La franja se solapa con otro horario ya registrado para ese día");
          return false;
        }

        return {
          diaSemana,
          horaInicio,
          horaFin,
          activo,
        };
      },
    });

    if (!isConfirmed || !value) {
      return;
    }

    try {
      await crearHorario(repartidor.id, value);
      await Swal.fire({
        icon: "success",
        title: "Horario creado",
        text: "La franja horaria fue registrada correctamente",
      });
    } catch (errorOperacion) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo crear el horario",
        text: obtenerMensajeErrorOperacion(errorOperacion),
      });
    }
  };

  const alternarEstadoHorario = async (horarioId: number, activoActual: boolean): Promise<void> => {
    try {
      await actualizarHorario(repartidor.id, horarioId, { activo: !activoActual });
    } catch (errorOperacion) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo actualizar el horario",
        text: obtenerMensajeErrorOperacion(errorOperacion),
      });
    }
  };

  const removerHorario = async (horarioId: number, diaSemana: number, horaInicio: string, horaFin: string): Promise<void> => {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "Eliminar horario",
      text: `¿Deseas eliminar el horario ${NOMBRES_DIA_SEMANA[diaSemana]} ${horaInicio} - ${horaFin}?`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      await eliminarHorario(repartidor.id, horarioId);
    } catch (errorOperacion) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar el horario",
        text: obtenerMensajeErrorOperacion(errorOperacion),
      });
    }
  };

  return (
    <section className="repartidores">
      <header className="repartidores__encabezado">
        <div>
          <h2>Horarios de {repartidor.nombre}</h2>
          <p>Gestiona únicamente los horarios del repartidor seleccionado.</p>
        </div>

        <div className="repartidores__accionesFila">
          <button className="repartidores__botonPrincipal" onClick={agregarHorario} disabled={procesandoHorarios}>
            + Nuevo horario
          </button>
          <button className="repartidores__botonSecundario" onClick={onVolver} disabled={procesandoHorarios}>
            Volver a repartidores
          </button>
        </div>
      </header>

      {errorHorarios && <div className="repartidores__error">{errorHorarios}</div>}

      <div className="repartidores__tablaContenedor">
        {cargandoHorarios ? (
          <p className="repartidores__estado">Cargando horarios...</p>
        ) : horarios.length === 0 ? (
          <p className="repartidores__estado">Este repartidor no tiene horarios registrados.</p>
        ) : (
          <table className="repartidores__tabla">
            <thead>
              <tr>
                <th>Día</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {horarios.map((horario) => (
                <tr key={horario.id}>
                  <td>{NOMBRES_DIA_SEMANA[horario.diaSemana]}</td>
                  <td>{horario.horaInicio}</td>
                  <td>{horario.horaFin}</td>
                  <td>
                    <span
                      className={`repartidores__estadoTag ${
                        horario.activo ? "repartidores__estadoTag--activo" : "repartidores__estadoTag--inactivo"
                      }`}
                    >
                      {horario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="repartidores__accionesFila">
                      <button
                        className="repartidores__botonAccion repartidores__botonAccion--editar"
                        onClick={() => alternarEstadoHorario(horario.id, horario.activo)}
                        disabled={procesandoHorarios}
                      >
                        {horario.activo ? "Inactivar" : "Activar"}
                      </button>
                      <button
                        className="repartidores__botonAccion repartidores__botonAccion--eliminar"
                        onClick={() => removerHorario(horario.id, horario.diaSemana, horario.horaInicio, horario.horaFin)}
                        disabled={procesandoHorarios}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

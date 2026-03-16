import Swal from "sweetalert2";
import "./Repartidores.app.css";
import {
  useRepartidores,
  type DatosActualizarRepartidorRequest,
  type DatosCrearRepartidorRequest,
  type Repartidor,
} from "./useRepartidores";

function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "No fue posible completar la operación";
}

function escaparHtml(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function RepartidoresApp() {
  const { repartidores, cargando, procesando, error, crearRepartidor, actualizarRepartidor, eliminarRepartidor } =
    useRepartidores();

  const registrarRepartidor = async (): Promise<void> => {
    const { value, isConfirmed } = await Swal.fire<DatosCrearRepartidorRequest>({
      title: "Registrar repartidor",
      html: `
        <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
          <label style="font-size:0.9rem;font-weight:600">Nombre</label>
          <input id="swal-nombre" class="swal2-input" placeholder="Nombre del repartidor" style="margin:0">
          <label style="font-size:0.9rem;font-weight:600">Correo</label>
          <input id="swal-email" class="swal2-input" type="email" placeholder="correo@empresa.com" style="margin:0">
          <label style="font-size:0.9rem;font-weight:600">Contraseña</label>
          <input id="swal-password" class="swal2-input" type="password" placeholder="Contraseña" style="margin:0">
          <label style="font-size:0.9rem;font-weight:600">Capacidad del vehículo (kg)</label>
          <input id="swal-capacidad" class="swal2-input" type="number" min="1" step="1" placeholder="Ej: 20 kg" style="margin:0">
        </div>
      `,
      confirmButtonText: "Guardar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = (document.getElementById("swal-nombre") as HTMLInputElement).value.trim();
        const email = (document.getElementById("swal-email") as HTMLInputElement).value.trim().toLowerCase();
        const password = (document.getElementById("swal-password") as HTMLInputElement).value.trim();
        const capacidadVehiculo = Number((document.getElementById("swal-capacidad") as HTMLInputElement).value);

        if (!nombre) {
          Swal.showValidationMessage("El nombre es obligatorio");
          return false;
        }

        if (!email) {
          Swal.showValidationMessage("El correo es obligatorio");
          return false;
        }

        if (!password) {
          Swal.showValidationMessage("La contraseña es obligatoria");
          return false;
        }

        if (!Number.isInteger(capacidadVehiculo) || capacidadVehiculo <= 0) {
          Swal.showValidationMessage("La capacidad del vehículo debe ser un entero mayor a 0");
          return false;
        }

        return { nombre, email, password, capacidadVehiculo };
      },
    });

    if (!isConfirmed || !value) {
      return;
    }

    try {
      await crearRepartidor(value);
      await Swal.fire({
        icon: "success",
        title: "Repartidor creado",
        text: "El repartidor fue almacenado correctamente",
      });
    } catch (errorOperacion) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo crear",
        text: obtenerMensajeError(errorOperacion),
      });
    }
  };

  const editarRepartidor = async (repartidor: Repartidor): Promise<void> => {
    const { value, isConfirmed } = await Swal.fire<DatosActualizarRepartidorRequest>({
      title: "Actualizar repartidor",
      html: `
        <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
          <label style="font-size:0.9rem;font-weight:600">Nombre</label>
          <input id="swal-nombre" class="swal2-input" value="${escaparHtml(repartidor.nombre)}" style="margin:0">
          <label style="font-size:0.9rem;font-weight:600">Correo</label>
          <input id="swal-email" class="swal2-input" type="email" value="${escaparHtml(repartidor.email)}" style="margin:0">
          <label style="font-size:0.9rem;font-weight:600">Nueva contraseña (opcional)</label>
          <input id="swal-password" class="swal2-input" type="password" placeholder="Dejar vacío para conservar" style="margin:0">
          <label style="font-size:0.9rem;font-weight:600">Capacidad del vehículo (kg)</label>
          <input id="swal-capacidad" class="swal2-input" type="number" min="1" step="1" value="${repartidor.capacidadVehiculo}" placeholder="Ej: 20 kg" style="margin:0">
        </div>
      `,
      confirmButtonText: "Actualizar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = (document.getElementById("swal-nombre") as HTMLInputElement).value.trim();
        const email = (document.getElementById("swal-email") as HTMLInputElement).value.trim().toLowerCase();
        const password = (document.getElementById("swal-password") as HTMLInputElement).value.trim();
        const capacidadVehiculo = Number((document.getElementById("swal-capacidad") as HTMLInputElement).value);

        if (!nombre) {
          Swal.showValidationMessage("El nombre es obligatorio");
          return false;
        }

        if (!email) {
          Swal.showValidationMessage("El correo es obligatorio");
          return false;
        }

        if (!Number.isInteger(capacidadVehiculo) || capacidadVehiculo <= 0) {
          Swal.showValidationMessage("La capacidad del vehículo debe ser un entero mayor a 0");
          return false;
        }

        const datosActualizar: DatosActualizarRepartidorRequest = {};

        if (nombre !== repartidor.nombre) {
          datosActualizar.nombre = nombre;
        }

        if (email !== repartidor.email) {
          datosActualizar.email = email;
        }

        if (capacidadVehiculo !== repartidor.capacidadVehiculo) {
          datosActualizar.capacidadVehiculo = capacidadVehiculo;
        }

        if (password) {
          datosActualizar.password = password;
        }

        if (Object.keys(datosActualizar).length === 0) {
          Swal.showValidationMessage("No hay cambios para actualizar");
          return false;
        }

        return datosActualizar;
      },
    });

    if (!isConfirmed || !value) {
      return;
    }

    try {
      await actualizarRepartidor(repartidor.id, value);
      await Swal.fire({
        icon: "success",
        title: "Repartidor actualizado",
        text: "Los cambios se guardaron correctamente",
      });
    } catch (errorOperacion) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo actualizar",
        text: obtenerMensajeError(errorOperacion),
      });
    }
  };

  const removerRepartidor = async (repartidor: Repartidor): Promise<void> => {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "Eliminar repartidor",
      text: `¿Deseas eliminar a ${repartidor.nombre}?`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      await eliminarRepartidor(repartidor.id);
      await Swal.fire({
        icon: "success",
        title: "Repartidor eliminado",
        text: "El repartidor fue eliminado del sistema",
      });
    } catch (errorOperacion) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text: obtenerMensajeError(errorOperacion),
      });
    }
  };

  return (
    <section className="repartidores">
      <header className="repartidores__encabezado">
        <div>
          <h2>Gestión de repartidores</h2>
          <p>Registra, actualiza y elimina repartidores para mantener la operación al día.</p>
        </div>

        <button className="repartidores__botonPrincipal" onClick={registrarRepartidor} disabled={procesando}>
          + Nuevo repartidor
        </button>
      </header>

      {error && <div className="repartidores__error">{error}</div>}

      <div className="repartidores__tablaContenedor">
        {cargando ? (
          <p className="repartidores__estado">Cargando repartidores...</p>
        ) : repartidores.length === 0 ? (
          <p className="repartidores__estado">No hay repartidores registrados.</p>
        ) : (
          <table className="repartidores__tabla">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Capacidad (kg)</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {repartidores.map((repartidor) => (
                <tr key={repartidor.id}>
                  <td>{repartidor.id}</td>
                  <td>{repartidor.nombre}</td>
                  <td>{repartidor.email}</td>
                  <td>{repartidor.capacidadVehiculo} kg</td>
                  <td>
                    <span
                      className={`repartidores__estadoTag ${
                        repartidor.activo ? "repartidores__estadoTag--activo" : "repartidores__estadoTag--inactivo"
                      }`}
                    >
                      {repartidor.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>{new Date(repartidor.createdAt).toLocaleString("es-CO")}</td>
                  <td>
                    <div className="repartidores__accionesFila">
                      <button
                        className="repartidores__botonAccion repartidores__botonAccion--editar"
                        onClick={() => editarRepartidor(repartidor)}
                        disabled={procesando}
                      >
                        Editar
                      </button>
                      <button
                        className="repartidores__botonAccion repartidores__botonAccion--eliminar"
                        onClick={() => removerRepartidor(repartidor)}
                        disabled={procesando}
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
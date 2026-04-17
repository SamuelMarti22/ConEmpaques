import { EstadoRuta, Role } from "../../databases/prisma/generated/prisma/enums.js";
import { prisma } from "../../databases/prisma/lib/prisma.js";
import { RepartidorNoEncontradoError } from "../repartidores/repartidor.service.js";

const ESTADOS_RUTA_ASIGNADA = [EstadoRuta.PENDIENTE, EstadoRuta.EN_PROCESO] as const;

const CAMPOS_PUBLICOS_HORARIO = {
  id: true,
  usuarioId: true,
  diaSemana: true,
  horaInicio: true,
  horaFin: true,
  activo: true,
} as const;

export interface DatosCrearHorarioRepartidor {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface DatosActualizarHorarioRepartidor {
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
  activo?: boolean;
}

export interface ResultadoValidacionRecepcionRuta {
  puedeRecibirRuta: boolean;
  mensaje: string;
  fechaHoraEvaluada: string;
  repartidor: {
    id: number;
    capacidad: number;
  } | null;
  horarioActivo: {
    id: number;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
  } | null;
}

export class HorarioNoEncontradoError extends Error {
  constructor(mensaje = "No existe un horario con el identificador indicado para este repartidor") {
    super(mensaje);
    this.name = "HorarioNoEncontradoError";
  }
}

export class HorarioSinCamposParaActualizarError extends Error {
  constructor(mensaje = "Debe enviar al menos un campo para actualizar el horario") {
    super(mensaje);
    this.name = "HorarioSinCamposParaActualizarError";
  }
}

export class RangoHorarioInvalidoError extends Error {
  constructor(mensaje = "La hora de inicio debe ser menor que la hora de fin") {
    super(mensaje);
    this.name = "RangoHorarioInvalidoError";
  }
}

export class HorarioSolapadoError extends Error {
  constructor(mensaje = "El horario se solapa con otra franja ya registrada para ese día") {
    super(mensaje);
    this.name = "HorarioSolapadoError";
  }
}

function validarRangoHorario(horaInicio: string, horaFin: string): void {
  if (horaInicio >= horaFin) {
    throw new RangoHorarioInvalidoError();
  }
}

async function verificarExistenciaRepartidor(repartidorId: number): Promise<void> {
  const repartidorExistente = await prisma.usuario.findFirst({
    where: {
      id: repartidorId,
      rol: Role.REPARTIDOR,
    },
    select: { id: true },
  });

  if (!repartidorExistente) {
    throw new RepartidorNoEncontradoError();
  }
}

async function validarSolapamientoHorario(
  repartidorId: number,
  diaSemana: number,
  horaInicio: string,
  horaFin: string,
  horarioIdExcluir?: number,
): Promise<void> {
  const horarioSolapado = await prisma.disponibilidad.findFirst({
    where: {
      usuarioId: repartidorId,
      diaSemana,
      ...(horarioIdExcluir === undefined ? {} : { id: { not: horarioIdExcluir } }),
      horaInicio: {
        lt: horaFin,
      },
      horaFin: {
        gt: horaInicio,
      },
    },
    select: {
      id: true,
    },
  });

  if (horarioSolapado) {
    throw new HorarioSolapadoError();
  }
}

async function listarHorarios(repartidorId: number) {
  await verificarExistenciaRepartidor(repartidorId);

  return prisma.disponibilidad.findMany({
    where: {
      usuarioId: repartidorId,
    },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }, { id: "asc" }],
    select: CAMPOS_PUBLICOS_HORARIO,
  });
}

async function crearHorario(repartidorId: number, datosCrear: DatosCrearHorarioRepartidor) {
  await verificarExistenciaRepartidor(repartidorId);
  validarRangoHorario(datosCrear.horaInicio, datosCrear.horaFin);
  await validarSolapamientoHorario(repartidorId, datosCrear.diaSemana, datosCrear.horaInicio, datosCrear.horaFin);

  return prisma.disponibilidad.create({
    data: {
      usuarioId: repartidorId,
      diaSemana: datosCrear.diaSemana,
      horaInicio: datosCrear.horaInicio,
      horaFin: datosCrear.horaFin,
      activo: datosCrear.activo,
    },
    select: CAMPOS_PUBLICOS_HORARIO,
  });
}

async function actualizarHorario(
  repartidorId: number,
  horarioId: number,
  datosActualizar: DatosActualizarHorarioRepartidor,
) {
  if (Object.keys(datosActualizar).length === 0) {
    throw new HorarioSinCamposParaActualizarError();
  }

  await verificarExistenciaRepartidor(repartidorId);

  const horarioExistente = await prisma.disponibilidad.findFirst({
    where: {
      id: horarioId,
      usuarioId: repartidorId,
    },
    select: CAMPOS_PUBLICOS_HORARIO,
  });

  if (!horarioExistente) {
    throw new HorarioNoEncontradoError();
  }

  const horaInicio = datosActualizar.horaInicio ?? horarioExistente.horaInicio;
  const horaFin = datosActualizar.horaFin ?? horarioExistente.horaFin;
  const diaSemana = datosActualizar.diaSemana ?? horarioExistente.diaSemana;

  validarRangoHorario(horaInicio, horaFin);

  const requiereValidarSolapamiento =
    diaSemana !== horarioExistente.diaSemana ||
    horaInicio !== horarioExistente.horaInicio ||
    horaFin !== horarioExistente.horaFin;

  if (requiereValidarSolapamiento) {
    await validarSolapamientoHorario(repartidorId, diaSemana, horaInicio, horaFin, horarioId);
  }

  return prisma.disponibilidad.update({
    where: { id: horarioId },
    data: datosActualizar,
    select: CAMPOS_PUBLICOS_HORARIO,
  });
}

async function eliminarHorario(repartidorId: number, horarioId: number) {
  await verificarExistenciaRepartidor(repartidorId);

  const resultado = await prisma.disponibilidad.deleteMany({
    where: {
      id: horarioId,
      usuarioId: repartidorId,
    },
  });

  if (resultado.count === 0) {
    throw new HorarioNoEncontradoError();
  }
}

async function tieneHorarioActivoEnMomento(repartidorId: number, diaSemana: number, hora: string): Promise<boolean> {
  const horarioActivo = await prisma.disponibilidad.findFirst({
    where: {
      usuarioId: repartidorId,
      diaSemana,
      activo: true,
      horaInicio: {
        lte: hora,
      },
      horaFin: {
        gt: hora,
      },
    },
    select: { id: true },
  });

  return Boolean(horarioActivo);
}

function formatearHora(horas: number, minutos: number): string {
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function obtenerClaveFechaLocal(fecha: Date | null | undefined): string {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    return "";
  }

  const anio = String(fecha.getFullYear());
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

async function validarRecepcionRuta(
  repartidorId: number,
  fechaHora: Date,
): Promise<ResultadoValidacionRecepcionRuta> {
  const repartidor = await prisma.usuario.findFirst({
    where: {
      id: repartidorId,
      rol: Role.REPARTIDOR,
    },
    select: {
      id: true,
      capacidadVehiculo: true,
    },
  });

  if (!repartidor) {
    throw new RepartidorNoEncontradoError();
  }

  const diaSemana = fechaHora.getDay();
  const hora = formatearHora(fechaHora.getHours(), fechaHora.getMinutes());

  const horarioActivo = await prisma.disponibilidad.findFirst({
    where: {
      usuarioId: repartidorId,
      diaSemana,
      activo: true,
      horaInicio: {
        lte: hora,
      },
      horaFin: {
        gt: hora,
      },
    },
    select: {
      id: true,
      diaSemana: true,
      horaInicio: true,
      horaFin: true,
    },
  });

  if (!horarioActivo) {
    return {
      puedeRecibirRuta: false,
      mensaje: "El repartidor no tiene un horario activo para la fecha y hora evaluadas",
      fechaHoraEvaluada: fechaHora.toISOString(),
      repartidor: null,
      horarioActivo: null,
    };
  }

  const claveFechaEvaluada = obtenerClaveFechaLocal(fechaHora);

  // Buscar rutas activas y filtrar por misma fecha exacta (UTC) para evitar arrastres de otras semanas.
  const rutasActivasMismaFecha = await prisma.ruta.findMany({
    where: {
      repartidorId,
      estadoRuta: {
        in: [...ESTADOS_RUTA_ASIGNADA],
      },
    },
    select: {
      id: true,
      fechaReparto: true,
      horaInicioEntrega: true,
      horaFinalizacionEntrega: true,
    },
  });

  const existeConflictoHorario = rutasActivasMismaFecha.some((rutaActiva) => {
    const fechaReferenciaRuta = rutaActiva.horaInicioEntrega ?? rutaActiva.fechaReparto;

    if (obtenerClaveFechaLocal(fechaReferenciaRuta) !== claveFechaEvaluada) {
      return false;
    }

    const inicioExistente = rutaActiva.horaInicioEntrega;

    if (!inicioExistente) {
      return false;
    }

    const finExistente: Date = rutaActiva.horaFinalizacionEntrega ?? inicioExistente;

    return inicioExistente <= fechaHora && fechaHora < finExistente;
  });

  if (existeConflictoHorario) {
    return {
      puedeRecibirRuta: false,
      mensaje: "El repartidor ya tiene una ruta asignada para esa fecha y hora",
      fechaHoraEvaluada: fechaHora.toISOString(),
      repartidor: null,
      horarioActivo,
    };
  }

  return {
    puedeRecibirRuta: true,
    mensaje: "El repartidor sí puede recibir rutas en la fecha y hora evaluadas",
    fechaHoraEvaluada: fechaHora.toISOString(),
    repartidor: {
      id: repartidor.id,
      capacidad: repartidor.capacidadVehiculo,
    },
    horarioActivo,
  };
}

export const horarioService = {
  listarHorarios,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
  tieneHorarioActivoEnMomento,
  validarRecepcionRuta,
};

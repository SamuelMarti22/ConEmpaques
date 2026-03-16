import { EstadoRuta, Role } from "../../databases/prisma/generated/prisma/enums.js";
import { prisma } from "../../databases/prisma/lib/prisma.js";
import { hash } from "bcryptjs";

const ESTADOS_ENTREGA_ACTIVA = [EstadoRuta.PENDIENTE, EstadoRuta.EN_PROCESO] as const;
const RONDAS_HASH_PASSWORD = 10;

const CAMPOS_PUBLICOS_REPARTIDOR = {
  id: true,
  nombre: true,
  email: true,
  activo: true,
  capacidadVehiculo: true,
  rol: true,
  createdAt: true,
} as const;

export interface DatosCrearRepartidor {
  nombre: string;
  email: string;
  password: string;
  capacidadVehiculo: number;
}

export interface DatosActualizarRepartidor {
  nombre?: string;
  email?: string;
  password?: string;
  capacidadVehiculo?: number;
}

export class RepartidorNoEncontradoError extends Error {
  constructor(mensaje = "No existe un repartidor con el identificador indicado") {
    super(mensaje);
    this.name = "RepartidorNoEncontradoError";
  }
}

export class RepartidorSinCamposParaActualizarError extends Error {
  constructor(mensaje = "Debe enviar al menos un campo para actualizar") {
    super(mensaje);
    this.name = "RepartidorSinCamposParaActualizarError";
  }
}

export class RepartidorConEntregasActivasError extends Error {
  constructor(mensaje = "No se puede eliminar el repartidor porque tiene entregas activas") {
    super(mensaje);
    this.name = "RepartidorConEntregasActivasError";
  }
}

async function hashearPassword(passwordPlano: string): Promise<string> {
  return hash(passwordPlano, RONDAS_HASH_PASSWORD);
}

async function listar() {
  return prisma.usuario.findMany({
    where: { rol: Role.REPARTIDOR },
    orderBy: { id: "asc" },
    select: CAMPOS_PUBLICOS_REPARTIDOR,
  });
}

async function obtenerPorId(repartidorId: number) {
  return prisma.usuario.findFirst({
    where: {
      id: repartidorId,
      rol: Role.REPARTIDOR,
    },
    select: CAMPOS_PUBLICOS_REPARTIDOR,
  });
}

async function crear(datosCrear: DatosCrearRepartidor) {
  const passwordHasheado = await hashearPassword(datosCrear.password);

  return prisma.usuario.create({
    data: {
      nombre: datosCrear.nombre,
      email: datosCrear.email,
      password: passwordHasheado,
      capacidadVehiculo: datosCrear.capacidadVehiculo,
      rol: Role.REPARTIDOR,
      activo: false,
    },
    select: CAMPOS_PUBLICOS_REPARTIDOR,
  });
}

async function actualizar(repartidorId: number, datosActualizar: DatosActualizarRepartidor) {
  if (Object.keys(datosActualizar).length === 0) {
    throw new RepartidorSinCamposParaActualizarError();
  }

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

  const datosActualizarPersistencia: DatosActualizarRepartidor = {
    ...datosActualizar,
  };

  if (typeof datosActualizarPersistencia.password === "string") {
    datosActualizarPersistencia.password = await hashearPassword(datosActualizarPersistencia.password);
  }

  return prisma.usuario.update({
    where: { id: repartidorId },
    data: datosActualizarPersistencia,
    select: CAMPOS_PUBLICOS_REPARTIDOR,
  });
}

async function eliminar(repartidorId: number) {
  await prisma.$transaction(async (clienteTransaccional) => {
    const repartidorExistente = await clienteTransaccional.usuario.findFirst({
      where: {
        id: repartidorId,
        rol: Role.REPARTIDOR,
      },
      select: { id: true },
    });

    if (!repartidorExistente) {
      throw new RepartidorNoEncontradoError();
    }

    const cantidadEntregasActivas = await clienteTransaccional.ruta.count({
      where: {
        repartidorId,
        estadoRuta: {
          in: [...ESTADOS_ENTREGA_ACTIVA],
        },
      },
    });

    if (cantidadEntregasActivas > 0) {
      throw new RepartidorConEntregasActivasError();
    }

    await clienteTransaccional.disponibilidad.deleteMany({
      where: { usuarioId: repartidorId },
    });

    await clienteTransaccional.ruta.deleteMany({
      where: { repartidorId },
    });

    await clienteTransaccional.usuario.delete({
      where: { id: repartidorId },
    });
  });
}

export const repartidorService = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
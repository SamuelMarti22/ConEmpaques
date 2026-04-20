import { prisma } from "../../databases/prisma/lib/prisma.js";

export class CredencialesInvalidasError extends Error {
  constructor(mensaje?: string) {
    super(mensaje ?? "Credenciales inválidas");
    this.name = "CredencialesInvalidasError";
  }
}

export class UsuarioNoEncontradoError extends Error {
  constructor(mensaje?: string) {
    super(mensaje ?? "Usuario no encontrado");
    this.name = "UsuarioNoEncontradoError";
  }
}

type LoginLogisticoResponse = {
  mensaje: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
  };
};

type LoginRepartidorResponse = {
  mensaje: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
  };
};

type LoginClienteResponse = {
  mensaje: string;
  cliente: {
    codigo: string;
    rutaId: number;
    estado: string;
  };
};

async function loginLogistico(email: string, password: string): Promise<LoginLogisticoResponse> {
  // Buscar usuario con rol ADMIN
  const usuario = await prisma.usuario.findFirst({
    where: {
      email,
      rol: "ADMIN",
    },
  });

  if (!usuario) {
    throw new UsuarioNoEncontradoError("Usuario logístico no encontrado");
  }

  // Aquí iría la validación de password (con bcrypt, por ejemplo)
  // Por ahora solo verificamos que exista
  // TODO: Implementar comparación de contraseña hasheada
  if (usuario.password !== password) {
    throw new CredencialesInvalidasError();
  }

  return {
    mensaje: "Autenticación exitosa",
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

async function loginRepartidor(email: string, password: string): Promise<LoginRepartidorResponse> {
  // Buscar usuario con rol REPARTIDOR
  const usuario = await prisma.usuario.findFirst({
    where: {
      email,
      rol: "REPARTIDOR",
    },
  });

  if (!usuario) {
    throw new UsuarioNoEncontradoError("Repartidor no encontrado");
  }

  // Aquí iría la validación de password (con bcrypt, por ejemplo)
  // TODO: Implementar comparación de contraseña hasheada
  if (usuario.password !== password) {
    throw new CredencialesInvalidasError();
  }

  return {
    mensaje: "Autenticación exitosa",
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

async function loginCliente(codigo: string): Promise<LoginClienteResponse> {
  type LoginClienteDBRow = {
    rutaId: number;
    codigo: string;
    estado: string;
  };

  // Buscar el código de pedido en los puntosEntrega
  const rutaConPunto = await prisma.$queryRaw<LoginClienteDBRow[]>`
    SELECT re.ruta_id as rutaId, re.codigo, re.estado
    FROM ruta_entrega re
    WHERE re.codigo = ${codigo}
    LIMIT 1
  `;

  if (!rutaConPunto || rutaConPunto.length === 0) {
    throw new UsuarioNoEncontradoError("Código de pedido no encontrado");
  }

  const pedido = rutaConPunto[0];
  if (!pedido) {
    throw new UsuarioNoEncontradoError("Código de pedido no encontrado");
  }

  return {
    mensaje: "Autenticación exitosa",
    cliente: {
      codigo: pedido.codigo,
      rutaId: pedido.rutaId,
      estado: pedido.estado,
    },
  };
}

export const authService = {
  loginLogistico,
  loginRepartidor,
  loginCliente,
};

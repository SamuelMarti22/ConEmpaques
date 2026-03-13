import mongoose, { Schema, Document } from "mongoose";

//////////////////////
// INTERFACES
//////////////////////

export interface IPuntoEntrega {
  nombreCliente: string;
  codigo: string;
  contactoCliente: string;
  latitud: number;
  longitud: number;
  cantidadProducto: number;
  descripcionProducto: string;
  estadoEntrega: "PENDIENTE" | "ENTREGADO" | "FALLIDO";
  fechaHoraEntrega?: Date;
  firmaUrl?: string;
  motivoFallido?: string;
}

export interface IRutaEntrega extends Document {
  rutaId: number; // FK de MySQL
  puntosEntrega: (IPuntoEntrega & IPuntoEntregaMethods)[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPuntoEntregaMethods {
  getNombreCliente(): string;
  setNombreCliente(valor: string): void;
  getCodigo(): string;
  setCodigo(valor: string): void;
  getContactoCliente(): string;
  setContactoCliente(valor: string): void;
  getLatitud(): number;
  setLatitud(valor: number): void;
  getLongitud(): number;
  setLongitud(valor: number): void;
  getCantidadProducto(): number;
  setCantidadProducto(valor: number): void;
  getDescripcionProducto(): string;
  setDescripcionProducto(valor: string): void;
  getEstadoEntrega(): "PENDIENTE" | "ENTREGADO" | "FALLIDO";
  setEstadoEntrega(valor: "PENDIENTE" | "ENTREGADO" | "FALLIDO"): void;
  getFechaHoraEntrega(): Date | undefined;
  setFechaHoraEntrega(valor: Date): void;
  getFirmaUrl(): string | undefined;
  setFirmaUrl(valor: string): void;
  getMotivoFallido(): string | undefined;
  setMotivoFallido(valor: string): void;
}

export interface IRutaEntregaMethods {
  getRutaId(): number;
  setRutaId(valor: number): void;
  getPuntosEntrega(): (IPuntoEntrega & IPuntoEntregaMethods)[];
  setPuntosEntrega(valor: (IPuntoEntrega & IPuntoEntregaMethods)[]): void;
  addPuntoEntrega(punto: (IPuntoEntrega & IPuntoEntregaMethods)): void;
  removePuntoEntrega(codigo: string): void;
  getPuntoEntregaByCodigo(codigo: string): (IPuntoEntrega & IPuntoEntregaMethods) | undefined;
  getNombreClienteByCodigo(codigo: string): string | undefined;
  getCreatedAt(): Date;
  getUpdatedAt(): Date;
}

//////////////////////
// SUBDOCUMENTO
//////////////////////

export const PuntoEntregaSchema = new Schema<IPuntoEntrega, mongoose.Model<IPuntoEntrega, {}, IPuntoEntregaMethods>, IPuntoEntregaMethods>({
  nombreCliente: { type: String, required: true },
  codigo: { type: String, required: true },
  contactoCliente: { type: String, required: true },
  latitud: { type: Number, required: true },
  longitud: { type: Number, required: true },
  cantidadProducto: { type: Number, required: true },
  descripcionProducto: { type: String },

  estadoEntrega: {
    type: String,
    enum: ["PENDIENTE", "ENTREGADO", "FALLIDO"],
    default: "PENDIENTE",
  },

  fechaHoraEntrega: { type: Date },
  firmaUrl: { type: String },
  motivoFallido: { type: String },
});

//////////////////////
// DOCUMENTO PRINCIPAL
//////////////////////

export const RutaEntregaSchema = new Schema<IRutaEntrega, mongoose.Model<IRutaEntrega, {}, IRutaEntregaMethods>, IRutaEntregaMethods>(
  {
    rutaId: {
      type: Number,
      required: true,
      index: true, // 🔥 importante para búsquedas rápidas
    },

    puntosEntrega: [PuntoEntregaSchema],
  },
  {
    timestamps: true,
  }
);

export const RutaEntregaModel = mongoose.model<IRutaEntrega, mongoose.Model<IRutaEntrega, {}, IRutaEntregaMethods>>(
  "RutaEntrega",
  RutaEntregaSchema
);

import mongoose, { Document, Schema } from "mongoose";

//////////////////////
// INTERFACES
//////////////////////

export interface IPuntoEntrega {
  id: number;
  nombreCliente: string;
  codigo: string;
  contactoCliente: string;
  direccion: string;
  latitud: number;
  longitud: number;
  pesoProducto: number;
  descripcionEntrega: string;
  estadoEntrega: "EN_BODEGA" | "PENDIENTE" | "EN_CAMINO" | "ENTREGADO" | "FALLIDO";
  fechaHoraEntrega?: Date;
  firmaUrl?: string;
  motivoFallido?: string;
}

export interface IRutaEntrega extends Document {
  rutaId: number; // FK de MySQL
  puntosEntrega: (IPuntoEntrega & IPuntoEntregaMethods)[];
  geometria: number[][];
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
  getDescripcionEntrega(): string;
  setDescripcionEntrega(valor: string): void;
  getEstadoEntrega(): "EN_BODEGA" | "PENDIENTE" | "EN_CAMINO" | "ENTREGADO" | "FALLIDO";
  setEstadoEntrega(valor: "EN_BODEGA" | "PENDIENTE" | "EN_CAMINO" | "ENTREGADO" | "FALLIDO"): void;
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
  pesoProducto: { type: Number, required: true },
  descripcionEntrega: { type: String },
  direccion: { type: String, required: true },

  estadoEntrega: {
    type: String,
    enum: ["EN_BODEGA", "PENDIENTE", "EN_CAMINO", "ENTREGADO", "FALLIDO"],
    default: "EN_BODEGA",
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
    geometria: {
      type: [[Number]],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const RutaEntregaModel = mongoose.model<IRutaEntrega, mongoose.Model<IRutaEntrega, {}, IRutaEntregaMethods>>(
  "RutaEntrega",
  RutaEntregaSchema
);

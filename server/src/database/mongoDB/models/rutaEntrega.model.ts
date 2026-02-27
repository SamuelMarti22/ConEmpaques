import mongoose from "mongoose";
import { PuntoEntregaSchema, RutaEntregaSchema } from "../schema.js";
import type { IPuntoEntrega, IRutaEntrega, IRutaEntregaMethods, IPuntoEntregaMethods } from "../schema.js";

//////////////////////
// MÉTODOS PUNTO ENTREGA
//////////////////////

PuntoEntregaSchema.methods.getNombreCliente = function(): string { return this.nombreCliente; };
PuntoEntregaSchema.methods.setNombreCliente = function(valor: string): void { this.nombreCliente = valor; };

PuntoEntregaSchema.methods.getCodigo = function(): string { return this.codigo; };
PuntoEntregaSchema.methods.setCodigo = function(valor: string): void { this.codigo = valor; };

PuntoEntregaSchema.methods.getContactoCliente = function(): string { return this.contactoCliente; };
PuntoEntregaSchema.methods.setContactoCliente = function(valor: string): void { this.contactoCliente = valor; };

PuntoEntregaSchema.methods.getLatitud = function(): number { return this.latitud; };
PuntoEntregaSchema.methods.setLatitud = function(valor: number): void { this.latitud = valor; };

PuntoEntregaSchema.methods.getLongitud = function(): number { return this.longitud; };
PuntoEntregaSchema.methods.setLongitud = function(valor: number): void { this.longitud = valor; };

PuntoEntregaSchema.methods.getCantidadProducto = function(): number { return this.cantidadProducto; };
PuntoEntregaSchema.methods.setCantidadProducto = function(valor: number): void { this.cantidadProducto = valor; };

PuntoEntregaSchema.methods.getDescripcionProducto = function(): string { return this.descripcionProducto; };
PuntoEntregaSchema.methods.setDescripcionProducto = function(valor: string): void { this.descripcionProducto = valor; };

PuntoEntregaSchema.methods.getEstadoEntrega = function(): "PENDIENTE" | "ENTREGADO" | "FALLIDO" { return this.estadoEntrega; };
PuntoEntregaSchema.methods.setEstadoEntrega = function(valor: "PENDIENTE" | "ENTREGADO" | "FALLIDO"): void { this.estadoEntrega = valor; };

PuntoEntregaSchema.methods.getFechaHoraEntrega = function(): Date | undefined { return this.fechaHoraEntrega; };
PuntoEntregaSchema.methods.setFechaHoraEntrega = function(valor: Date): void { this.fechaHoraEntrega = valor; };

PuntoEntregaSchema.methods.getFirmaUrl = function(): string | undefined { return this.firmaUrl; };
PuntoEntregaSchema.methods.setFirmaUrl = function(valor: string): void { this.firmaUrl = valor; };

PuntoEntregaSchema.methods.getMotivoFallido = function(): string | undefined { return this.motivoFallido; };
PuntoEntregaSchema.methods.setMotivoFallido = function(valor: string): void { this.motivoFallido = valor; };

//////////////////////
// MÉTODOS RUTA ENTREGA
//////////////////////

RutaEntregaSchema.methods.getRutaId = function(): number { return this.rutaId; };
RutaEntregaSchema.methods.setRutaId = function(valor: number): void { this.rutaId = valor; };

RutaEntregaSchema.methods.getPuntosEntrega = function(): (IPuntoEntrega & IPuntoEntregaMethods)[] { return this.puntosEntrega; };
RutaEntregaSchema.methods.setPuntosEntrega = function(valor: (IPuntoEntrega & IPuntoEntregaMethods)[]): void { this.puntosEntrega = valor; };

RutaEntregaSchema.methods.addPuntoEntrega = function(punto: (IPuntoEntrega & IPuntoEntregaMethods)): void { this.puntosEntrega.push(punto); };
RutaEntregaSchema.methods.removePuntoEntrega = function(codigo: string): void {
  this.puntosEntrega = this.puntosEntrega.filter((p: IPuntoEntrega) => p.codigo !== codigo);
};

RutaEntregaSchema.methods.getPuntoEntregaByCodigo = function(codigo: string): (IPuntoEntrega & IPuntoEntregaMethods) | undefined {
  return this.puntosEntrega.find((p: IPuntoEntrega) => p.codigo === codigo);
};

RutaEntregaSchema.methods.getNombreClienteByCodigo = function(codigo: string): string | undefined {
  return this.puntosEntrega.find((p: IPuntoEntrega) => p.codigo === codigo)?.nombreCliente;
};

RutaEntregaSchema.methods.getCreatedAt = function(): Date { return this.createdAt; };
RutaEntregaSchema.methods.getUpdatedAt = function(): Date { return this.updatedAt; };

//////////////////////
// MODELO
//////////////////////

export const RutaEntregaModel = mongoose.model<IRutaEntrega, mongoose.Model<IRutaEntrega, {}, IRutaEntregaMethods>>(
  "RutaEntrega",
  RutaEntregaSchema
);
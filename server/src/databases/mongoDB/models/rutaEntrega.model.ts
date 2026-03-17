import mongoose from "mongoose";
import { RutaEntregaSchema } from "../schema.js";
import type { IRutaEntrega } from "../schema.js";

export const RutaEntregaModel = mongoose.model<IRutaEntrega>("RutaEntrega", RutaEntregaSchema);
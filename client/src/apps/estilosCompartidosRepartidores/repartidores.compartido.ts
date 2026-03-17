export const URL_API_BASE = ((import.meta.env.VITE_API_URL as string | undefined)?.trim() || "http://localhost:3000").replace(/\/$/, "");
export const URL_REPARTIDORES = `${URL_API_BASE}/api/repartidores`;

export async function obtenerMensajeErrorHttp(response: Response): Promise<string> {
  try {
    const datos = (await response.json()) as { mensaje?: string };
    if (typeof datos.mensaje === "string" && datos.mensaje.trim().length > 0) {
      return datos.mensaje;
    }
  } catch {
    // No fue posible parsear el cuerpo de error
  }

  return `Error ${response.status}: ${response.statusText || "No se pudo completar la operación"}`;
}

export function obtenerMensajeErrorOperacion(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "No fue posible completar la operación";
}

export function escaparHtml(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

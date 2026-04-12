import { PuntoEntrega } from '../classes/PuntoEntrega';

export const STORAGE_KEY_PUNTOS = 'conempaques:puntos-entrega';

export function recuperarPuntosGuardados(storageKey: string = STORAGE_KEY_PUNTOS): PuntoEntrega[] {
    if (typeof window === 'undefined') {
        return [];
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map((punto) => {
            const id = Number(punto.id ?? 0);
            const nombreCliente = String(punto.nombreCliente ?? punto.cliente ?? 'Cliente');
            const latitud = Number(punto.latitud ?? 0);
            const longitud = Number(punto.longitud ?? 0);
            const pesoProducto = Number(punto.pesoProducto ?? 0);

            return new PuntoEntrega(
                id,
                nombreCliente,
                latitud,
                longitud,
                pesoProducto,
                String(punto.direccion ?? ''),
                String(punto.codigo ?? `P-${id}`),
                String(punto.contactoCliente ?? 'Sin contacto'),
                String(punto.descripcionProducto ?? ''),
                (punto.estadoEntrega ?? 'PENDIENTE') as 'PENDIENTE' | 'ENTREGADO' | 'FALLIDO',
                punto.fechaHoraEntrega ? new Date(punto.fechaHoraEntrega) : undefined,
                punto.firmaUrl,
                punto.motivoFallido
            );
        });
    } catch {
        return [];
    }
}
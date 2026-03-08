export class PuntoEntrega {
    cliente: string;
    latitud: number;
    longitud: number;

    constructor(cliente: string, latitud: number, longitud: number) {
        this.cliente = cliente;
        this.latitud = latitud;
        this.longitud = longitud;
    }

    getCliente(): string {
        return this.cliente
    }

    getLongitud(): number {
        return this.longitud
    }

    getLatitud(): number {
        return this.latitud
    }

    getCoordenadas(): [number, number] {
        return [this.longitud, this.latitud];
    }
}
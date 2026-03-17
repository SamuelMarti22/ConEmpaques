export class PuntoEntrega {
    id: number;
    cliente: string;
    latitud: number;
    longitud: number;
    peso: number;

    constructor(id: number, cliente: string, latitud: number, longitud: number, peso: number) {
        this.id = id;
        this.cliente = cliente;
        this.latitud = latitud;
        this.longitud = longitud;
        this.peso = peso;
    }

    getId(): number {
        return this.id;
    }

    getCliente(): string {
        return this.cliente
    }

    setCliente(cliente: string): void {
        this.cliente = cliente;
    }

    getLongitud(): number {
        return this.longitud
    }

    setLongitud(longitud: number): void {
        this.longitud = longitud;
    }

    getLatitud(): number {
        return this.latitud
    }

    setLatitud(latitud: number): void {
        this.latitud = latitud;
    }

    getCoordenadas(): [number, number] {
        return [this.longitud, this.latitud];
    }

    setCoordenadas(latitud: number, longitud: number): void {
        this.latitud = latitud;
        this.longitud = longitud;
    }

    getPeso(): number {
        return this.peso;
    }

    setPeso(peso: number): void {
        this.peso = peso;
    }
}
export class PuntoEntrega {
    id: number;
    nombreCliente: string;
    direccion: string;
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

    constructor(
        id: number,
        nombreCliente: string,
        latitud: number,
        longitud: number,
        cantidadProducto: number,
        direccion: string = '',
        codigo: string = `P-${id}`,
        contactoCliente: string = 'Sin contacto',
        descripcionProducto: string = '',
        estadoEntrega: "PENDIENTE" | "ENTREGADO" | "FALLIDO" = "PENDIENTE",
        fechaHoraEntrega?: Date,
        firmaUrl?: string,
        motivoFallido?: string
    ) {
        this.id = id;
        this.nombreCliente = nombreCliente;
        this.direccion = direccion;
        this.codigo = codigo;
        this.contactoCliente = contactoCliente;
        this.latitud = latitud;
        this.longitud = longitud;
        this.cantidadProducto = cantidadProducto;
        this.descripcionProducto = descripcionProducto;
        this.estadoEntrega = estadoEntrega;
        this.fechaHoraEntrega = fechaHoraEntrega;
        this.firmaUrl = firmaUrl;
        this.motivoFallido = motivoFallido;
    }

    // Alias para mantener compatibilidad con el frontend actual.
    get cliente(): string {
        return this.nombreCliente;
    }

    set cliente(valor: string) {
        this.nombreCliente = valor;
    }

    get peso(): number {
        return this.cantidadProducto;
    }

    set peso(valor: number) {
        this.cantidadProducto = valor;
    }

    getId(): number {
        return this.id;
    }

    getCliente(): string {
        return this.nombreCliente;
    }

    setCliente(cliente: string): void {
        this.nombreCliente = cliente;
    }

    getDireccion(): string {
        return this.direccion;
    }

    setDireccion(direccion: string): void {
        this.direccion = direccion;
    }

    getNombreCliente(): string {
        return this.nombreCliente;
    }

    setNombreCliente(nombreCliente: string): void {
        this.nombreCliente = nombreCliente;
    }

    getCodigo(): string {
        return this.codigo;
    }

    setCodigo(codigo: string): void {
        this.codigo = codigo;
    }

    getContactoCliente(): string {
        return this.contactoCliente;
    }

    setContactoCliente(contactoCliente: string): void {
        this.contactoCliente = contactoCliente;
    }

    getLongitud(): number {
        return this.longitud;
    }

    setLongitud(longitud: number): void {
        this.longitud = longitud;
    }

    getLatitud(): number {
        return this.latitud;
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
        return this.cantidadProducto;
    }

    setPeso(peso: number): void {
        this.cantidadProducto = peso;
    }

    getCantidadProducto(): number {
        return this.cantidadProducto;
    }

    setCantidadProducto(cantidadProducto: number): void {
        this.cantidadProducto = cantidadProducto;
    }

    getDescripcionProducto(): string {
        return this.descripcionProducto;
    }

    setDescripcionProducto(descripcionProducto: string): void {
        this.descripcionProducto = descripcionProducto;
    }

    getEstadoEntrega(): "PENDIENTE" | "ENTREGADO" | "FALLIDO" {
        return this.estadoEntrega;
    }

    setEstadoEntrega(estadoEntrega: "PENDIENTE" | "ENTREGADO" | "FALLIDO"): void {
        this.estadoEntrega = estadoEntrega;
    }

    getFechaHoraEntrega(): Date | undefined {
        return this.fechaHoraEntrega;
    }

    setFechaHoraEntrega(fechaHoraEntrega: Date): void {
        this.fechaHoraEntrega = fechaHoraEntrega;
    }

    getFirmaUrl(): string | undefined {
        return this.firmaUrl;
    }

    setFirmaUrl(firmaUrl: string): void {
        this.firmaUrl = firmaUrl;
    }

    getMotivoFallido(): string | undefined {
        return this.motivoFallido;
    }

    setMotivoFallido(motivoFallido: string): void {
        this.motivoFallido = motivoFallido;
    }
}
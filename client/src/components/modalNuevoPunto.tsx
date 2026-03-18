// modalNuevoPunto.ts
import Swal from "sweetalert2";

export async function abrirModalNuevoPunto() {
    const result = await Swal.fire({
        title: 'Nuevo punto de entrega',
        html: `
                    <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
                        <label style="font-size:0.9rem;font-weight:600">Nombre del cliente</label>
                        <input id="swal-cliente" class="swal2-input" placeholder="Ej: Empresa XYZ" style="margin:0">
                        <label style="font-size:0.9rem;font-weight:600">Latitud</label>
                        <input id="swal-latitud" class="swal2-input" type="number" step="any" placeholder="Ej: 6.2442" style="margin:0">
                        <label style="font-size:0.9rem;font-weight:600">Longitud</label>
                        <input id="swal-longitud" class="swal2-input" type="number" step="any" placeholder="Ej: -75.5636" style="margin:0">
                        <label style="font-size:0.9rem;font-weight:600">Peso (kg)</label>
                        <input id="swal-peso" class="swal2-input" type="number" step="any" placeholder="Ej: 5.5" style="margin:0">
                    </div>
                `,
        confirmButtonText: '📍 Agregar',
        confirmButtonColor: '#3b82f6',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        preConfirm: () => {
            const cliente = (document.getElementById('swal-cliente') as HTMLInputElement).value.trim();
            const latitud = parseFloat((document.getElementById('swal-latitud') as HTMLInputElement).value);
            const longitud = parseFloat((document.getElementById('swal-longitud') as HTMLInputElement).value);
            const peso = parseFloat((document.getElementById('swal-peso') as HTMLInputElement).value);

            if (!cliente) {
                Swal.showValidationMessage('El nombre del cliente es obligatorio');
                return false;
            }
            if (isNaN(latitud) || isNaN(longitud)) {
                Swal.showValidationMessage('Las coordenadas deben ser números válidos');
                return false;
            }
            if (isNaN(peso)) {
                Swal.showValidationMessage('El peso debe ser un número válido');
                return false;
            }
            return { cliente, latitud, longitud, peso };
        }
    });

    if (!result.isConfirmed || !result.value) {
        console.log("Agregación de punto cancelada o con datos inválidos (Desde el componente)");
        return null;
    }
    
    return result.value; // { cliente, latitud, longitud, peso }
}
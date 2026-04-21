type EstadoEntrega = 'EN_BODEGA' | 'PENDIENTE' | 'EN_ENTREGA' | 'EN_CAMINO' | 'ENTREGADO' | 'FALLIDO' | undefined;

interface NotificacionCambioEstadoParams {
	estadoAnterior: EstadoEntrega;
	estadoNuevo: EstadoEntrega;
	codigoEntrega?: string;
	nombreCliente?: string;
}

const TITULO_NOTIFICACION = 'Tu pedido ya salio a entrega';
const REQUESTED_PERMISSION_KEY = 'conempaques.notifications.permission.requested';

export function solicitarPermisoNotificacionesSiHaceFalta(): void {
	if (typeof window === 'undefined' || !('Notification' in window)) {
		return;
	}

	if (Notification.permission !== 'default') {
		return;
	}

	if (localStorage.getItem(REQUESTED_PERMISSION_KEY) === '1') {
		return;
	}

	localStorage.setItem(REQUESTED_PERMISSION_KEY, '1');
	void Notification.requestPermission();
}

export function notificarCambioAPrimerTramoEntrega({
	estadoAnterior,
	estadoNuevo,
	codigoEntrega,
	nombreCliente,
}: NotificacionCambioEstadoParams): void {
	if (estadoAnterior !== 'PENDIENTE' || estadoNuevo !== 'EN_ENTREGA') {
		return;
	}

	if (typeof window === 'undefined' || !('Notification' in window)) {
		return;
	}

	if (Notification.permission !== 'granted') {
		return;
	}

	const cuerpo = nombreCliente
		? `${nombreCliente}, tu pedido ${codigoEntrega ? `(${codigoEntrega}) ` : ''}ya va en camino.`
		: `Tu pedido ${codigoEntrega ? `(${codigoEntrega}) ` : ''}ya va en camino.`;

	new Notification(TITULO_NOTIFICACION, {
		body: cuerpo,
		tag: codigoEntrega ? `pedido-en-entrega-${codigoEntrega}` : 'pedido-en-entrega',
	});
}

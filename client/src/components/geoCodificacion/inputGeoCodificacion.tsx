import { useEffect, useMemo, useRef, useState } from 'react';
import './inputGeoCodificacion.css';
import { useGeocodificacion } from './useGeoCodificacion';

interface Prediccion {
	id: string;
	descripcion: string;
	mainText: string;
	secondaryText: string;
}

export interface PuntoGeocodificado {
	cliente: string;
	direccion: string;
	latitud: number;
	longitud: number;
	confianza: number;
	tipoResultado: string;
}

interface InputGeoCodificacionProps {
	cliente: string;
	onSeleccionarUbicacion: (data: PuntoGeocodificado) => void;
	placeholder?: string;
	minCaracteresBusqueda?: number;
	disabled?: boolean;
}

export default function InputGeoCodificacion({
	cliente,
	onSeleccionarUbicacion,
	placeholder = 'Buscar direccion en Colombia',
	minCaracteresBusqueda = 3,
	disabled = false
}: InputGeoCodificacionProps) {
	const { obtenerPredicciones, geocodificar, cargando, error } = useGeocodificacion();
	const [textoBusqueda, setTextoBusqueda] = useState('');
	const [predicciones, setPredicciones] = useState<Prediccion[]>([]);
	const [mostrarLista, setMostrarLista] = useState(false);
	const [cargandoPredicciones, setCargandoPredicciones] = useState(false);
	const [errorLocal, setErrorLocal] = useState<string | null>(null);

	const timeoutRef = useRef<number | null>(null);
	const contenedorRef = useRef<HTMLDivElement | null>(null);

	const puedeBuscar = useMemo(
		() => textoBusqueda.trim().length >= minCaracteresBusqueda,
		[textoBusqueda, minCaracteresBusqueda]
	);

	useEffect(() => {
		const cerrarSiClickFuera = (event: MouseEvent) => {
			if (!contenedorRef.current) return;
			if (!contenedorRef.current.contains(event.target as Node)) {
				setMostrarLista(false);
			}
		};

		document.addEventListener('mousedown', cerrarSiClickFuera);
		return () => document.removeEventListener('mousedown', cerrarSiClickFuera);
	}, []);

	useEffect(() => {
		if (!puedeBuscar || disabled) {
			setPredicciones([]);
			setMostrarLista(false);
			setCargandoPredicciones(false);
			return;
		}

		if (timeoutRef.current) {
			window.clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = window.setTimeout(async () => {
			setErrorLocal(null);
			setCargandoPredicciones(true);

			const resultados = await obtenerPredicciones(textoBusqueda);
			setPredicciones(resultados);
			setMostrarLista(true);
			setCargandoPredicciones(false);
		}, 350);

		return () => {
			if (timeoutRef.current) {
				window.clearTimeout(timeoutRef.current);
			}
		};
	}, [textoBusqueda, puedeBuscar, obtenerPredicciones, disabled]);

	const seleccionarPrediccion = async (prediccion: Prediccion) => {
		setErrorLocal(null);
		setMostrarLista(false);
		setTextoBusqueda(prediccion.descripcion);

		const resultado = await geocodificar(prediccion.descripcion);

		if (!resultado) {
			setErrorLocal('No fue posible geocodificar la direccion seleccionada.');
			return;
		}

		onSeleccionarUbicacion({
			cliente,
			direccion: resultado.direccion,
			latitud: resultado.latitud,
			longitud: resultado.longitud,
			confianza: resultado.confianza,
			tipoResultado: resultado.tipoResultado
		});
	};

	return (
		<div className="geo-input" ref={contenedorRef}>
			<label className="geo-input__label" htmlFor="geo-direccion">
				Direccion
			</label>

			<input
				id="geo-direccion"
				className="geo-input__control"
				type="text"
				value={textoBusqueda}
				onChange={(event) => setTextoBusqueda(event.target.value)}
				onFocus={() => {
					if (predicciones.length > 0) {
						setMostrarLista(true);
					}
				}}
				placeholder={placeholder}
				autoComplete="off"
				disabled={disabled}
			/>

			<div className="geo-input__status">
				{cargandoPredicciones ? 'Buscando sugerencias...' : null}
				{cargando ? 'Geocodificando direccion...' : null}
			</div>

			{mostrarLista && predicciones.length > 0 ? (
				<ul className="geo-input__lista" role="listbox" aria-label="Sugerencias de direccion">
					{predicciones.map((prediccion) => (
						<li key={prediccion.id} className="geo-input__item">
							<button
								type="button"
								className="geo-input__item-btn"
								onClick={() => void seleccionarPrediccion(prediccion)}
								disabled={disabled || cargando}
							>
								<span className="geo-input__item-main">{prediccion.mainText}</span>
								<span className="geo-input__item-secondary">{prediccion.secondaryText}</span>
							</button>
						</li>
					))}
				</ul>
			) : null}

			{errorLocal ? <p className="geo-input__error">{errorLocal}</p> : null}
			{!errorLocal && error ? <p className="geo-input__error">{error}</p> : null}
		</div>
	);
}

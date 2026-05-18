import * as XLSX from 'xlsx';

export type FilaEntregaExportable = {
  id: string;
  conductor: string;
  zona: string;
  estado: string;
  estadoSistema: string;
  creadoEn: string;
  asignadoEn: string;
  recogidoEn: string;
  entregadoEn: string;
};

export type MetadatosExportEntregas = {
  generadoEn: Date;
  totalFiltradas: number;
  totalCargadas: number;
  totalServidor?: number;
  filtros: {
    repartidor: string;
    estado: string;
    entregaDesde: string;
    entregaHasta: string;
  };
};

type PartesFecha = { fecha: string; hora: string };

const ANCHOS_ENTREGAS = [
  { wch: 5 },
  { wch: 20 },
  { wch: 22 },
  { wch: 18 },
  { wch: 16 },
  { wch: 14 },
  { wch: 12 },
  { wch: 14 },
  { wch: 12 },
];

function partesFecha(iso: string): PartesFecha {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { fecha: '', hora: '' };
  }
  return {
    fecha: new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d),
    hora: new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d),
  };
}

function formatearFechaLarga(fecha: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
}

function etiquetaFiltroEstado(estado: string): string {
  if (estado === 'todos') return 'Todos los estados';
  return estado;
}

function etiquetaFiltroFecha(valor: string): string {
  if (!valor) return 'Sin límite';
  const [y, m, d] = valor.split('-');
  if (!y || !m || !d) return valor;
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(y), Number(m) - 1, Number(d)));
}

function crearHojaResumen(meta: MetadatosExportEntregas): XLSX.WorkSheet {
  const totalSrv =
    meta.totalServidor !== undefined && meta.totalServidor > 0
      ? meta.totalServidor
      : 'No disponible';

  const filas: (string | number)[][] = [
    ['REPORTE DE ENTREGAS'],
    ['Dashboard logístico'],
    [],
    ['INFORMACIÓN DEL REPORTE'],
    ['Exportado el', formatearFechaLarga(meta.generadoEn)],
    ['Entregas en este archivo', meta.totalFiltradas],
    ['Entregas cargadas en pantalla', meta.totalCargadas],
    ['Total registrado en servidor', totalSrv],
    [],
    ['FILTROS APLICADOS EN PANTALLA'],
    ['Repartidor', meta.filtros.repartidor.trim() || 'Todos'],
    ['Estado', etiquetaFiltroEstado(meta.filtros.estado)],
    ['Entrega desde', etiquetaFiltroFecha(meta.filtros.entregaDesde)],
    ['Entrega hasta', etiquetaFiltroFecha(meta.filtros.entregaHasta)],
    [],
    ['CÓMO LEER LA HOJA "ENTREGAS"'],
    ['Nº', 'Número de fila en este archivo.'],
    ['Código seguimiento', 'Identificador del pedido o entrega.'],
    ['Repartidor', 'Persona asignada a la entrega.'],
    ['Zona', 'Zona o barrio de destino.'],
    ['Estado', 'Situación operativa visible en el panel.'],
    ['Fecha / Hora de entrega', 'Momento en que se registró la entrega.'],
    ['Fecha / Hora de registro', 'Momento en que aparece creado el registro.'],
  ];

  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja['!cols'] = [{ wch: 32 }, { wch: 48 }];
  if (hoja['!ref']) {
    hoja['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    ];
  }
  return hoja;
}

type FilaHojaEntregas = {
  'Nº': number;
  'Código seguimiento': string;
  Repartidor: string;
  Zona: string;
  Estado: string;
  'Fecha de entrega': string;
  'Hora de entrega': string;
  'Fecha de registro': string;
  'Hora de registro': string;
};

function filaOrdenada(registro: FilaEntregaExportable, indice: number): FilaHojaEntregas {
  const entrega = partesFecha(registro.entregadoEn);
  const registroCreado = partesFecha(registro.creadoEn);

  return {
    'Nº': indice + 1,
    'Código seguimiento': registro.id,
    Repartidor: registro.conductor || 'Sin asignar',
    Zona: registro.zona || 'Sin zona',
    Estado: registro.estado,
    'Fecha de entrega': entrega.fecha,
    'Hora de entrega': entrega.hora,
    'Fecha de registro': registroCreado.fecha,
    'Hora de registro': registroCreado.hora,
  };
}

function crearHojaEntregas(registros: FilaEntregaExportable[]): XLSX.WorkSheet {
  const ordenados = [...registros].sort((a, b) => {
    const ta = new Date(a.entregadoEn).getTime();
    const tb = new Date(b.entregadoEn).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  const filas = ordenados.map((r, i) => filaOrdenada(r, i));
  const hoja = XLSX.utils.json_to_sheet(filas, { skipHeader: false });

  hoja['!cols'] = ANCHOS_ENTREGAS;

  if (hoja['!ref'] && filas.length > 0) {
    hoja['!autofilter'] = { ref: hoja['!ref'] };
    hoja['!freeze'] = {
      xSplit: 0,
      ySplit: 1,
      topLeftCell: 'A2',
      activePane: 'bottomLeft',
      state: 'frozen',
    };
  }

  return hoja;
}

/** Construye libro Excel con las hojas Resumen y Entregas */
export function construirLibroEntregas(
  registros: FilaEntregaExportable[],
  metadatos: MetadatosExportEntregas,
): XLSX.WorkBook {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, crearHojaResumen(metadatos), 'Resumen');
  XLSX.utils.book_append_sheet(libro, crearHojaEntregas(registros), 'Entregas');
  return libro;
}

export function exportarEntregasExcel(
  registros: FilaEntregaExportable[],
  nombreArchivo: string,
  metadatos: MetadatosExportEntregas,
): void {
  const libro = construirLibroEntregas(registros, metadatos);
  const archivo = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  XLSX.writeFile(libro, archivo, { bookType: 'xlsx', compression: true });
}

export function nombreArchivoExportEntregas(fecha = new Date()): string {
  const stamp = new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(fecha)
    .replace(/[/\s:,]/g, '-')
    .replace(/-+/g, '-');
  return `dashboard-entregas-${stamp}.xlsx`;
}

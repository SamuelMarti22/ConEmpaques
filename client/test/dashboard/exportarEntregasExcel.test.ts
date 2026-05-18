import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';

const writeFileMock = vi.hoisted(() => vi.fn());

vi.mock('xlsx', async importOriginal => {
  const mod = await importOriginal<typeof import('xlsx')>();
  return { ...mod, writeFile: writeFileMock };
});

import {
  construirLibroEntregas,
  exportarEntregasExcel,
  nombreArchivoExportEntregas,
} from '../../src/apps/dashboard/utilidades/exportarEntregasExcel';

describe('exportarEntregasExcel', () => {
  const metadatos = {
    generadoEn: new Date('2026-05-15T12:00:00'),
    totalFiltradas: 1,
    totalCargadas: 1,
    totalServidor: 10,
    filtros: {
      repartidor: '',
      estado: 'todos',
      entregaDesde: '',
      entregaHasta: '',
    },
  };

  const registro = {
    id: 'ENT-1',
    conductor: 'Ana López',
    zona: 'Centro',
    estado: 'Completado',
    estadoSistema: 'DELIVERED',
    creadoEn: '2026-05-10T10:00:00.000Z',
    asignadoEn: '2026-05-10T10:10:00.000Z',
    recogidoEn: '2026-05-10T10:20:00.000Z',
    entregadoEn: '2026-05-10T11:00:00.000Z',
  };

  it('genera libro con hojas Resumen y Entregas', () => {
    const libro = construirLibroEntregas([registro], metadatos);
    expect(libro.SheetNames).toEqual(['Resumen', 'Entregas']);

    const hojaEntregas = libro.Sheets.Entregas;
    const filas = XLSX.utils.sheet_to_json<Record<string, string | number>>(hojaEntregas);
    expect(filas).toHaveLength(1);
    expect(filas[0]['Código seguimiento']).toBe('ENT-1');
    expect(filas[0].Repartidor).toBe('Ana López');
    expect(filas[0]['Fecha de entrega']).toBeTruthy();
    expect(filas[0]['Hora de entrega']).toBeTruthy();
    expect(hojaEntregas['!autofilter']).toBeDefined();
    expect(hojaEntregas['!freeze']).toBeDefined();
  });

  it('ordena por fecha de entrega descendente y tolera fechas inválidas', () => {
    const libro = construirLibroEntregas(
      [
        { ...registro, id: 'VIEJO', entregadoEn: '2026-05-01T10:00:00.000Z' },
        { ...registro, id: 'RECIENTE', entregadoEn: '2026-05-12T10:00:00.000Z' },
        { ...registro, id: 'INVALIDO', entregadoEn: 'no-es-fecha' },
      ],
      metadatos,
    );
    const filas = XLSX.utils.sheet_to_json<{ 'Código seguimiento': string }>(libro.Sheets.Entregas);
    expect(filas[0]['Código seguimiento']).toBe('RECIENTE');
    expect(filas.map(f => f['Código seguimiento'])).toContain('INVALIDO');
  });

  it('hoja Resumen refleja filtros y totales del servidor', () => {
    const libro = construirLibroEntregas([], {
      ...metadatos,
      totalFiltradas: 0,
      totalServidor: 42,
      filtros: {
        repartidor: 'Ana',
        estado: 'Completado',
        entregaDesde: '2026-05-01',
        entregaHasta: '2026-05-15',
      },
    });
    const resumen = XLSX.utils.sheet_to_json<(string | number)[]>(libro.Sheets.Resumen, { header: 1 });
    const texto = resumen.flat().join('|');
    expect(texto).toContain('42');
    expect(texto).toContain('Ana');
    expect(texto).toContain('Completado');
  });

  it('exportarEntregasExcel escribe archivo con extensión xlsx', () => {
    writeFileMock.mockClear();
    exportarEntregasExcel([registro], 'informe', metadatos);
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.any(Object),
      'informe.xlsx',
      expect.objectContaining({ bookType: 'xlsx' }),
    );
  });

  it('nombreArchivoExportEntregas incluye prefijo y extensión', () => {
    const nombre = nombreArchivoExportEntregas(new Date('2026-05-15T08:30:00'));
    expect(nombre).toMatch(/^dashboard-entregas-/);
    expect(nombre.endsWith('.xlsx')).toBe(true);
  });
});

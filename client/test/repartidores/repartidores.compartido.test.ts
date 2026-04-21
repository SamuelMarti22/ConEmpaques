import { describe, expect, it } from 'vitest'
import {
    URL_API_BASE,
    URL_REPARTIDORES,
    escaparHtml,
    obtenerMensajeErrorHttp,
    obtenerMensajeErrorOperacion,
} from '../../src/apps/estilosCompartidosRepartidores/repartidores.compartido'

describe('repartidores.compartido', () => {
  it('expone URL base y endpoint de repartidores', () => {
    expect(URL_API_BASE.length).toBeGreaterThan(0)
    expect(URL_REPARTIDORES).toBe(`${URL_API_BASE}/api/repartidores`)
  })

  it('obtenerMensajeErrorHttp retorna mensaje del backend cuando existe', async () => {
    const response = {
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ mensaje: 'Correo inválido' }),
    } as Response

    await expect(obtenerMensajeErrorHttp(response)).resolves.toBe('Correo inválido')
  })

  it('obtenerMensajeErrorHttp usa fallback cuando mensaje no viene o es vacío', async () => {
    const response = {
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ mensaje: '   ' }),
    } as Response

    await expect(obtenerMensajeErrorHttp(response)).resolves.toBe('Error 503: Service Unavailable')
  })

  it('obtenerMensajeErrorHttp usa fallback cuando el cuerpo no es JSON parseable', async () => {
    const response = {
      status: 500,
      statusText: '',
      json: async () => {
        throw new Error('invalid json')
      },
    } as Response

    await expect(obtenerMensajeErrorHttp(response)).resolves.toBe('Error 500: No se pudo completar la operación')
  })

  it('obtenerMensajeErrorOperacion retorna message cuando es Error con texto', () => {
    expect(obtenerMensajeErrorOperacion(new Error('fallo controlado'))).toBe('fallo controlado')
  })

  it('obtenerMensajeErrorOperacion usa fallback para errores desconocidos', () => {
    expect(obtenerMensajeErrorOperacion('')).toBe('No fue posible completar la operación')
    expect(obtenerMensajeErrorOperacion({})).toBe('No fue posible completar la operación')
  })

  it('escaparHtml escapa caracteres especiales', () => {
    expect(escaparHtml("<div class='x'>&\"hola\"</div>")).toBe('&lt;div class=&#39;x&#39;&gt;&amp;&quot;hola&quot;&lt;/div&gt;')
  })
})

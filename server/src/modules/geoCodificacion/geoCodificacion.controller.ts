import { Router, Request, Response } from 'express';
import { geocodificarDireccion, obtenerPredicciones } from './geoCodificacion.service';

const geoCodificacionRutas = Router();

geoCodificacionRutas.post('/geocodificar', async (req: Request, res: Response) => {
    const { direccion } = req.body;

    if (!direccion) {
        return res.status(400).json({ error: 'Dirección requerida' });
    }

    const resultado = await geocodificarDireccion(direccion);

    if (!resultado) {
        return res.status(404).json({ error: 'No se encontró la dirección' });
    }

    res.json(resultado);
});

geoCodificacionRutas.get('/predicciones', async (req: Request, res: Response) => {
    const { input } = req.query;

    if (!input) {
        return res.status(400).json({ error: 'Input requerido' });
    }

    const predicciones = await obtenerPredicciones(input as string);
    res.json(predicciones);
});

export default geoCodificacionRutas;
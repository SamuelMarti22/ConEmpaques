import { existsSync, mkdirSync } from 'fs';
import multer from 'multer';
import path from 'path';

// Ruta donde guardar imágenes: /server/src/images
// Usa process.cwd() para asegurar que funcione tanto en desarrollo como en producción
const imagenDir = path.join(process.cwd(), 'src/images');
const EXTENSION_POR_MIME: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
};

function obtenerExtensionArchivo(file: { originalname: string; mimetype?: string }): string {
    const extDesdeNombre = path.extname(file.originalname).toLowerCase();
    if (extDesdeNombre) {
        return extDesdeNombre;
    }

    if (file.mimetype) {
        const extensionDesdeMime = EXTENSION_POR_MIME[file.mimetype];

        if (extensionDesdeMime) {
            return extensionDesdeMime;
        }
    }

    return '.jpg';
}

// Crear carpeta si no existe
if (!existsSync(imagenDir)) {
    mkdirSync(imagenDir, { recursive: true });
}

/**
 * Configuración de almacenamiento para Multer
 */
const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        cb(null, imagenDir);
    },
    filename: (req: any, file: any, cb: any) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + obtenerExtensionArchivo(file));
    }
});

/**
 * Filtro para aceptar solo imágenes
 */
const fileFilter = (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const esImagenPorExtension = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(ext);
    const esImagenPorMime = typeof file.mimetype === 'string' && file.mimetype.startsWith('image/');

    if (esImagenPorExtension || esImagenPorMime) {
        cb(null, true);
    } else {
        cb(new Error('Solo se aceptan archivos de imagen (jpg, jpeg, png, gif, webp, heic, heif)'));
    }
};

/**
 * Configuración de Multer para subida de imágenes
 */
export const uploadMiddleware = multer({
    storage,
    fileFilter
});

/**
 * Procesa la respuesta de una imagen subida
 * Retorna la ruta relativa para usar en el cliente
 */
export function obtenerRutaImagen(filename: string): string {
    return `/images/${filename}`;
}

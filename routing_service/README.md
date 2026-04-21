# Routing Service

Servicio de optimización de rutas para ConEmpaques.

## Configuración del Entorno

### Instalación

1. Crea un entorno virtual:
```bash
python -m venv routing-env
source routing-env/bin/activate  # En Windows: routing-env\Scripts\activate
```

2. Instala las dependencias incluyendo las herramientas de desarrollo:
```bash
pip install -e ".[dev]"
```

## Ruff - Linter y Formateador

Ruff es un linter y formateador de Python extremadamente rápido escrito en Rust.

### Comandos Útiles

**Analizar código (sin modificar):**
```bash
ruff check app/
```

**Arreglar problemas automáticamente:**
```bash
ruff check app/ --fix
```

**Formatear código:**
```bash
ruff format app/
```

**Verificar específico:**
```bash
ruff check app/ --select E,W,F  # Solo errores y warnings específicos
```

### Configuración

La configuración de Ruff se encuentra en `pyproject.toml` bajo `[tool.ruff]`:

- **line-length**: 100 caracteres
- **target-version**: Python 3.9+
- **Reglas seleccionadas**:
  - E, W: Errores y warnings de estilo (pycodestyle)
  - F: Errores lógicos (Pyflakes)
  - I: Ordenamiento de imports (isort)
  - B: Detección de bugs (flake8-bugbear)
  - C4: Mejoras de comprensiones
  - UP: Modernización de código (pyupgrade)
  - ARG: Argumentos no utilizados
  - SIM: Simplificaciones de código

## Tests

Ejecutar tests:
```bash
pytest
```

Con cobertura:
```bash
pytest --cov=app --cov-report=html
```

from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from app.services.optimization import OptimizationService
from app.models.schema import OptimizacionRequest, OptimizacionResponse
import os
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)

load_dotenv()

app = FastAPI(title="Routing Service")

@app.get("/health")
def health():
    return { "status": "ok" }

@app.post("/optimizar", response_model=OptimizacionResponse)
async def optimizar(request: OptimizacionRequest):
    try:
        result = await OptimizationService().optimizar(request)

        # Validar si se obtuvieron rutas válidas
        if not getattr(result, "rutas", None):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "No se pudieron generar rutas válidas",
                    "razon": "Verifica que haya puntos de entrega, repartidores disponibles y que la capacidad total sea suficiente para todos los puntos."
                }
            )

        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logging.exception("Error interno durante la optimización de rutas")
        raise HTTPException(
            status_code=500,
            detail="Error interno en el microservicio de optimización. Revisa conectividad de OSRM y datos de entrada.",
        ) from exc

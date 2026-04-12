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
        if not result.rutas:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "No se pudieron generar rutas válidas",
                    "razon": "Verifica que haya puntos de entrega, repartidores disponibles y que la capacidad total sea suficiente para todos los puntos."
                }
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Error al generar rutas",
                "razon": str(e)
            }
        )
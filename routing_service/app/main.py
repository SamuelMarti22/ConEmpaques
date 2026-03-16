from fastapi import FastAPI
from dotenv import load_dotenv
from app.services.optimization import OptimizationService
from app.models.schema import OptimizacionRequest, OptimizacionResponse
import os

from routing_service.app.models.schema import OptimizacionResponse
from routing_service.app.services import optimization

load_dotenv()

app = FastAPI(title="Routing Service")

@app.get("/health")
def health():
    return { "status": "ok" }

@app.post("/optimizar", response_model=OptimizacionResponse)
async def optimizar(request: OptimizacionRequest):
    return await OptimizationService().optimizar(request)
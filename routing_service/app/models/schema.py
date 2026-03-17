from pydantic import BaseModel

# Modelos de datos Request

class PuntoEntrega(BaseModel):
    id: int
    latitud: float
    longitud: float
    peso: float

class CapacidadRepartidor(BaseModel):
    id: int
    capacidad: float
    
class OptimizacionRequest(BaseModel):
    deposito: dict[str, float]  
    puntos_entrega: list[PuntoEntrega]
    capacidades_repartidores: list[CapacidadRepartidor]
    

# Modelos de datos Response

class RutaRepartidor(BaseModel):
    repartidor_id: str
    ruta: list[str]  
    geometria: list[list[float]]
    distancia_total: float
    tiempo_estimado: float
    
class OptimizacionResponse(BaseModel):
    rutas: list[RutaRepartidor]
    

    

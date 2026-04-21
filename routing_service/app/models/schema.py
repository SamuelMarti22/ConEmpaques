from pydantic import BaseModel, ConfigDict, Field

# Modelos de datos Request


class PuntoEntrega(BaseModel):
    id: int
    latitud: float
    longitud: float
    peso: float


class CapacidadRepartidor(BaseModel):
    id: int = Field(alias="idRepartidor")
    capacidad: float = Field(alias="capacidadRepartidor")

    model_config = ConfigDict(populate_by_name=True)


class OptimizacionRequest(BaseModel):
    deposito: dict[str, float]
    puntos_entrega: list[PuntoEntrega]
    capacidades_repartidores: list[CapacidadRepartidor]


# Modelos de datos Response


class RutaRepartidor(BaseModel):
    repartidor_id: int
    ruta: list[int]
    geometria: list[list[float]]
    distancia_total: float
    tiempo_estimado: float


class OptimizacionResponse(BaseModel):
    rutas: list[RutaRepartidor]

import asyncio
from app.services.optimization import OptimizationService
from app.models.schema import OptimizacionRequest, PuntoEntrega, CapacidadRepartidor
from dotenv import load_dotenv

load_dotenv()

request_json = {
    "deposito": { "latitud": 6.2442, "longitud": -75.5812 },
    "puntos_entrega": [
        { "id": "1", "latitud": 6.2530, "longitud": -75.5742, "peso": 10 },
        { "id": "2", "latitud": 6.2611, "longitud": -75.5800, "peso": 15 },
        { "id": "3", "latitud": 6.2350, "longitud": -75.5900, "peso": 8  },
        { "id": "4", "latitud": 6.2480, "longitud": -75.5650, "peso": 20 },
    ],
    "capacidades_repartidores": [
        { "id": "repartidor-001", "capacidad": 30 },
        { "id": "repartidor-002", "capacidad": 30 }
    ]
}

async def test():
    service = OptimizationService()

    request = OptimizacionRequest(
        deposito=request_json["deposito"],
        puntos_entrega=[PuntoEntrega(**p) for p in request_json["puntos_entrega"]],
        capacidades_repartidores=[CapacidadRepartidor(**v) for v in request_json["capacidades_repartidores"]]
    )

    resultado = await service.optimizar(request)

    print("✅ Rutas optimizadas:")
    for ruta in resultado.rutas:
        print(f"\n🚗 {ruta.repartidor_id}")
        print(f"   Paradas:          {ruta.ruta}")
        print(f"   Distancia total:  {ruta.distancia_total}m")
        print(f"   Tiempo estimado:  {ruta.tiempo_estimado}s")
        print(f"   Puntos geometría: {len(ruta.geometria)} coordenadas")
        print(f"   Primera coord:    {ruta.geometria[0]}")
        print(f"   Última coord:     {ruta.geometria[-1]}")

asyncio.run(test())
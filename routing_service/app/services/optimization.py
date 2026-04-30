from app.models.schema import OptimizacionRequest, OptimizacionResponse, PuntoEntrega
from app.services.geometryRoute import GeometryRouteService
from app.services.matrix import MatrixService
from app.services.routing import RoutingService


class OptimizationService:
    def __init__(self):
        self.matrix_service = MatrixService()
        self.routing_service = RoutingService()
        self.geometry_service = GeometryRouteService()

    async def optimizar(self, request: OptimizacionRequest) -> OptimizacionResponse:

        matriz_distancias = await self.matrix_service.get_matriz_distancias(
            request.deposito, request.puntos_entrega
        )
        respuesta = self.routing_service.resolver_rutas(
            matriz_distancias, request.puntos_entrega, request.capacidades_repartidores
        )

        matriz_tiempos = await self.matrix_service.get_matriz_tiempos(
            request.deposito, request.puntos_entrega
        )
        for ruta in respuesta.rutas:
            ruta.tiempo_estimado = self.__calcular_tiempo(
                ruta.ruta, request.puntos_entrega, matriz_tiempos
            )
            ruta.geometria = await self.geometry_service.get_geometry_route(
                ruta, request.puntos_entrega, request.deposito
            )

        return respuesta

    def __calcular_tiempo(
        self,
        paradas: list[int],
        puntos_entrega: list[PuntoEntrega],
        matriz_tiempos: list[list[float]],
    ) -> float:
        indice_por_id = {p.id: i + 1 for i, p in enumerate(puntos_entrega)}
        orden = [0] + [indice_por_id[id] for id in paradas]

        tiempo_total = 0
        for i in range(len(orden) - 1):
            tiempo_total += matriz_tiempos[orden[i]][orden[i + 1]]

        return tiempo_total

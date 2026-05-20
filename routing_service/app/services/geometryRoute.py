import os

import httpx

from app.models.schema import PuntoEntrega, RutaRepartidor


class GeometryRouteService:
    def __init__(self):
        self.osrm_url = os.getenv("OSRM_URL")

    async def get_geometry_route(
        self, ruta: RutaRepartidor, puntos_entrega: list[PuntoEntrega], deposito: dict[str, float]
    ) -> list[list[float]]:

        coordenadas_puntos_entrrega = self.ordenar_puntos_entrega(puntos_entrega, ruta)
        coordenadas_deposito = [deposito["longitud"], deposito["latitud"]]

        coordenadas_entrega = (
            [coordenadas_deposito]
            + [
                [punto_entrega.longitud, punto_entrega.latitud]
                for punto_entrega in coordenadas_puntos_entrrega
            ]
            + [coordenadas_deposito]
        )
        coordenadas_OSRM = self.mapear_coordenadas_OSRM(coordenadas_entrega)

        url_osrm = f"http://router.project-osrm.org/route/v1/driving/{coordenadas_OSRM}?geometries=geojson"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url_osrm)
            response.raise_for_status()
            data = response.json()

        return data["routes"][0]["geometry"]["coordinates"]

    def ordenar_puntos_entrega(
        self, puntos_entrega: list[PuntoEntrega], ruta: RutaRepartidor
    ) -> list[PuntoEntrega]:
        diccionario_puntos_entrega = {
            punto_entrega.id: punto_entrega for punto_entrega in puntos_entrega
        }
        coordenadas_puntos_ordenados = [diccionario_puntos_entrega[id] for id in ruta.ruta]

        return coordenadas_puntos_ordenados

    def mapear_coordenadas_OSRM(self, coordenadas: list[list[float]]) -> str:
        coordenadasOSRM = ";".join([f"{coord[0]},{coord[1]}" for coord in coordenadas])

        return coordenadasOSRM

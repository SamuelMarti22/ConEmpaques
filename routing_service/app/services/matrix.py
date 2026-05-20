import os

import httpx

from app.models.schema import PuntoEntrega


class MatrixService:
    def __init__(self):
        self.url_osrm = os.getenv("OSRM_URL") or "http://router.project-osrm.org"

    def mapear_optimizacion_request(
        self, deposito: dict[str, float], puntos_entrega: list[PuntoEntrega]
    ) -> list[list[float]]:
        coordenadas = [[deposito["longitud"], deposito["latitud"]]]
        for puntoEntrega in puntos_entrega:
            coordenadas.append([puntoEntrega.longitud, puntoEntrega.latitud])

        return coordenadas

    def mapear_coordenadas_OSRM(self, coordenadas: list[list[float]]) -> str:
        coordenadasOSRM = ";".join([f"{coord[0]},{coord[1]}" for coord in coordenadas])

        return coordenadasOSRM

    async def get_matriz_distancias(
        self, deposito: dict[str, float], puntos_entrega: list[PuntoEntrega]
    ) -> list[list[float]]:
        coordenadas = self.mapear_optimizacion_request(deposito, puntos_entrega)
        coordenadas_OSRM = self.mapear_coordenadas_OSRM(coordenadas)
        print(f"Coordenadas OSRM para matriz de distancias: {coordenadas_OSRM}")
        print(f"URL OSRM para matriz de distancias: {self.url_osrm}/table/v1/driving/{coordenadas_OSRM}?annotations=distance")

        url_osrm = f"http://router.project-osrm.org/table/v1/driving/{coordenadas_OSRM}?annotations=distance"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url_osrm)
            response.raise_for_status()
            data = response.json()

        return data["distances"]

    async def get_matriz_tiempos(
        self, deposito: dict[str, float], puntos_entrega: list[PuntoEntrega]
    ) -> list[list[float]]:
        coordenadas = self.mapear_optimizacion_request(deposito, puntos_entrega)
        coordenadas_OSRM = self.mapear_coordenadas_OSRM(coordenadas)

        url_osrm = f"http://router.project-osrm.org/table/v1/driving/{coordenadas_OSRM}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url_osrm)
            data = response.json()

        return data["durations"]

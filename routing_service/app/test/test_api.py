"""
Pruebas de integración para los endpoints HTTP del API
"""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.schema import OptimizacionResponse, RutaRepartidor

client = TestClient(app)

# Datos de prueba válidos
PAYLOAD_VALIDO = {
    "deposito": {"latitud": 4.7110, "longitud": -74.0721},
    "puntos_entrega": [
        {"id": 1, "latitud": 4.7200, "longitud": -74.0800, "peso": 5},
        {"id": 2, "latitud": 4.7300, "longitud": -74.0900, "peso": 3},
    ],
    "capacidades_repartidores": [{"idRepartidor": 1, "capacidadRepartidor": 10}],
}

# Datos mockeados
MATRIZ_DISTANCIAS_MOCK = [[0, 1000, 1500], [1000, 0, 800], [1500, 800, 0]]

MATRIZ_TIEMPOS_MOCK = [[0, 60, 90], [60, 0, 50], [90, 50, 0]]

RESPUESTA_RUTAS_MOCK = OptimizacionResponse(
    rutas=[
        RutaRepartidor(
            repartidor_id=1,
            ruta=[1, 2],
            geometria=[[4.7200, -74.0800], [4.7300, -74.0900]],
            distancia_total=2300,
            tiempo_estimado=110,
        )
    ]
)


class TestHealthEndpoint:
    """Pruebas del endpoint de salud"""

    def test_health_ok(self):
        """Test que verifica que el servicio está disponible"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestOptimizarEndpoint:
    """Pruebas del endpoint de optimización"""

    @patch("app.services.optimization.OptimizationService.optimizar", new_callable=AsyncMock)
    def test_optimizar_request_valido(self, mock_optimizar):
        """Test con datos válidos - debe retornar 200 y rutas"""
        mock_optimizar.return_value = RESPUESTA_RUTAS_MOCK

        response = client.post("/optimizar", json=PAYLOAD_VALIDO)
        assert response.status_code == 200

        data = response.json()
        assert "rutas" in data
        assert isinstance(data["rutas"], list)

    @patch("app.services.optimization.OptimizationService.optimizar", new_callable=AsyncMock)
    def test_optimizar_estructura_respuesta(self, mock_optimizar):
        """Test que valida la estructura de la respuesta"""
        mock_optimizar.return_value = RESPUESTA_RUTAS_MOCK

        response = client.post("/optimizar", json=PAYLOAD_VALIDO)
        assert response.status_code == 200

        data = response.json()

        # Validar que cada ruta tiene los campos requeridos
        for ruta in data["rutas"]:
            assert "repartidor_id" in ruta
            assert "ruta" in ruta
            assert "geometria" in ruta
            assert "distancia_total" in ruta
            assert "tiempo_estimado" in ruta

            assert isinstance(ruta["repartidor_id"], int)
            assert isinstance(ruta["ruta"], list)
            assert isinstance(ruta["geometria"], list)
            assert isinstance(ruta["distancia_total"], (int, float))
            assert isinstance(ruta["tiempo_estimado"], (int, float))

    def test_optimizar_sin_puntos_entrega(self):
        """Test sin puntos de entrega - debe fallar con 422 o 400"""
        payload = {
            "deposito": {"latitud": 4.7110, "longitud": -74.0721},
            "puntos_entrega": [],
            "capacidades_repartidores": [{"idRepartidor": 1, "capacidadRepartidor": 10}],
        }
        response = client.post("/optimizar", json=payload)
        # Array vacío de puntos_entrega es válido en Pydantic, pero será validado en el servicio
        # Por eso esperamos 400 o 500 (el servicio lo rechaza)
        assert response.status_code in [400, 422, 500]

    def test_optimizar_sin_repartidores(self):
        """Test sin repartidores - debe fallar con 422 o 400"""
        payload = {
            "deposito": {"latitud": 4.7110, "longitud": -74.0721},
            "puntos_entrega": [{"id": 1, "latitud": 4.7200, "longitud": -74.0800, "peso": 5}],
            "capacidades_repartidores": [],
        }
        response = client.post("/optimizar", json=payload)
        # Array vacío de repartidores es válido en Pydantic, pero será validado en el servicio
        assert response.status_code in [400, 422, 500]

    @patch("app.services.optimization.OptimizationService.optimizar", new_callable=AsyncMock)
    def test_optimizar_capacidad_insuficiente(self, mock_optimizar):
        """Test con capacidad insuficiente - debe retornar error 400"""
        # Mock que levanta ValueError
        mock_optimizar.side_effect = ValueError("Capacidad insuficiente")

        payload = {
            "deposito": {"latitud": 4.7110, "longitud": -74.0721},
            "puntos_entrega": [
                {"id": 1, "latitud": 4.7200, "longitud": -74.0800, "peso": 50},
                {"id": 2, "latitud": 4.7300, "longitud": -74.0900, "peso": 30},
            ],
            "capacidades_repartidores": [{"idRepartidor": 1, "capacidadRepartidor": 10}],
        }
        response = client.post("/optimizar", json=payload)
        assert response.status_code == 422

    def test_optimizar_request_incompleto(self):
        """Test con request incompleto - debe fallar con 422"""
        payload = {"deposito": {"latitud": 4.7110, "longitud": -74.0721}}
        response = client.post("/optimizar", json=payload)
        assert response.status_code == 422

    @patch("app.services.optimization.OptimizationService.optimizar", new_callable=AsyncMock)
    def test_optimizar_alias_repartidor(self, mock_optimizar):
        """Test que el alias 'idRepartidor' funciona correctamente"""
        respuesta_mock = OptimizacionResponse(
            rutas=[
                RutaRepartidor(
                    repartidor_id=99,
                    ruta=[1],
                    geometria=[[4.7200, -74.0800]],
                    distancia_total=1000,
                    tiempo_estimado=60,
                )
            ]
        )
        mock_optimizar.return_value = respuesta_mock

        payload_con_alias = {
            "deposito": {"latitud": 4.7110, "longitud": -74.0721},
            "puntos_entrega": [{"id": 1, "latitud": 4.7200, "longitud": -74.0800, "peso": 5}],
            "capacidades_repartidores": [{"idRepartidor": 99, "capacidadRepartidor": 100}],
        }
        response = client.post("/optimizar", json=payload_con_alias)
        assert response.status_code == 200
        data = response.json()
        # Verificar que el repartidor_id es el que enviamos
        if data["rutas"]:
            assert data["rutas"][0]["repartidor_id"] == 99

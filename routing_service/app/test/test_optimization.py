"""
Pruebas unitarias para la lógica del servicio de optimización
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.optimization import OptimizationService
from app.models.schema import (
    OptimizacionRequest,
    PuntoEntrega,
    CapacidadRepartidor,
    OptimizacionResponse,
    RutaRepartidor
)


# Fixtures con datos comunes para pruebas
@pytest.fixture
def puntos_entrega_basicos():
    """Fixture con puntos de entrega básicos"""
    return [
        PuntoEntrega(id=1, latitud=4.7200, longitud=-74.0800, peso=5),
        PuntoEntrega(id=2, latitud=4.7300, longitud=-74.0900, peso=3)
    ]


@pytest.fixture
def capacidades_repartidores():
    """Fixture con capacidades de repartidores"""
    return [
        CapacidadRepartidor(idRepartidor=1, capacidadRepartidor=10),
        CapacidadRepartidor(idRepartidor=2, capacidadRepartidor=15)
    ]


@pytest.fixture
def request_valido(puntos_entrega_basicos, capacidades_repartidores):
    """Fixture con un request válido"""
    return OptimizacionRequest(
        deposito={"latitud": 4.7110, "longitud": -74.0721},
        puntos_entrega=puntos_entrega_basicos,
        capacidades_repartidores=capacidades_repartidores
    )


@pytest.fixture
def matriz_distancias_mock():
    """Fixture con una matriz de distancias simulada"""
    return [
        [0, 1000, 1500],      # Depósito a puntos
        [1000, 0, 800],       # Punto 1 a otros
        [1500, 800, 0]        # Punto 2 a otros
    ]


@pytest.fixture
def matriz_tiempos_mock():
    """Fixture con una matriz de tiempos simulada"""
    return [
        [0, 60, 90],      # Depósito a puntos (segundos)
        [60, 0, 50],      # Punto 1 a otros
        [90, 50, 0]       # Punto 2 a otros
    ]


class TestOptimizationService:
    """Pruebas unitarias del OptimizationService"""
    
    @pytest.mark.asyncio
    async def test_optimizar_llamadas_correctas(self, request_valido, matriz_distancias_mock, matriz_tiempos_mock):
        """Test que verifica que el servicio llama a los métodos correctos"""
        service = OptimizationService()
        
        # Mock de los servicios internos
        service.matrix_service.get_matriz_distancias = AsyncMock(return_value=matriz_distancias_mock)
        service.matrix_service.get_matriz_tiempos = AsyncMock(return_value=matriz_tiempos_mock)
        service.routing_service.resolver_rutas = MagicMock(
            return_value=OptimizacionResponse(rutas=[
                RutaRepartidor(
                    repartidor_id=1,
                    ruta=[1, 2],
                    geometria=[[4.7200, -74.0800], [4.7300, -74.0900]],
                    distancia_total=2300,
                    tiempo_estimado=0
                )
            ])
        )
        service.geometry_service.get_geometry_route = AsyncMock(
            return_value=[[4.7200, -74.0800], [4.7300, -74.0900]]
        )
        
        # Llamar al método
        result = await service.optimizar(request_valido)
        
        # Verificaciones
        assert result is not None
        assert len(result.rutas) > 0
        
        # Verificar que se llamó a los servicios
        service.matrix_service.get_matriz_distancias.assert_called_once()
        service.matrix_service.get_matriz_tiempos.assert_called_once()
        service.routing_service.resolver_rutas.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_optimizar_calcula_tiempo_correcto(self, request_valido, matriz_distancias_mock, matriz_tiempos_mock):
        """Test que verifica el cálculo del tiempo estimado"""
        service = OptimizationService()
        
        # Mocks
        service.matrix_service.get_matriz_distancias = AsyncMock(return_value=matriz_distancias_mock)
        service.matrix_service.get_matriz_tiempos = AsyncMock(return_value=matriz_tiempos_mock)
        
        # La ruta es: depósito (0) -> punto 1 (id=1) -> punto 2 (id=2)
        # Tiempos: 0->1 (60s) + 1->2 (50s) = 110s
        service.routing_service.resolver_rutas = MagicMock(
            return_value=OptimizacionResponse(rutas=[
                RutaRepartidor(
                    repartidor_id=1,
                    ruta=[1, 2],
                    geometria=[],
                    distancia_total=2300,
                    tiempo_estimado=0  # Se debería actualizar
                )
            ])
        )
        service.geometry_service.get_geometry_route = AsyncMock(
            return_value=[]
        )
        
        result = await service.optimizar(request_valido)
        
        # El tiempo debe ser 110 (60 + 50)
        assert result.rutas[0].tiempo_estimado == 110
    
    def test_calcular_tiempo_valido(self, request_valido):
        """Test de la función auxiliar __calcular_tiempo"""
        service = OptimizationService()
        
        matriz_tiempos = [
            [0, 60, 90],
            [60, 0, 50],
            [90, 50, 0]
        ]
        
        # Ruta: 1 -> 2
        tiempo = service._OptimizationService__calcular_tiempo(
            paradas=[1, 2],
            puntos_entrega=request_valido.puntos_entrega,
            matriz_tiempos=matriz_tiempos
        )
        
        # Esperado: depósito (0) -> punto 1 (idx 1 en matriz) = 60, punto 1 -> punto 2 (idx 2) = 50
        # Total = 110
        assert tiempo == 110
    
    def test_calcular_tiempo_ruta_inversa(self, request_valido):
        """Test de cálculo de tiempo con ruta inversa"""
        service = OptimizationService()
        
        matriz_tiempos = [
            [0, 60, 90],
            [60, 0, 50],
            [90, 50, 0]
        ]
        
        # Ruta: 2 -> 1
        tiempo = service._OptimizationService__calcular_tiempo(
            paradas=[2, 1],
            puntos_entrega=request_valido.puntos_entrega,
            matriz_tiempos=matriz_tiempos
        )
        
        # Esperado: depósito (0) -> punto 2 (idx 2 en matriz) = 90, punto 2 -> punto 1 (idx 1) = 50
        # Total = 140
        assert tiempo == 140


class TestCalcularTiempoEdgeCases:
    """Pruebas de casos extremos en el cálculo de tiempo"""
    
    def test_calcular_tiempo_un_punto(self):
        """Test con una sola parada"""
        service = OptimizationService()
        
        puntos = [PuntoEntrega(id=1, latitud=4.7200, longitud=-74.0800, peso=5)]
        matriz_tiempos = [
            [0, 60],
            [60, 0]
        ]
        
        tiempo = service._OptimizationService__calcular_tiempo(
            paradas=[1],
            puntos_entrega=puntos,
            matriz_tiempos=matriz_tiempos
        )
        
        # Esperado: depósito -> punto 1 = 60
        assert tiempo == 60
    
    def test_calcular_tiempo_varios_puntos(self):
        """Test con múltiples paradas"""
        service = OptimizationService()
        
        puntos = [
            PuntoEntrega(id=1, latitud=4.7200, longitud=-74.0800, peso=5),
            PuntoEntrega(id=2, latitud=4.7300, longitud=-74.0900, peso=3),
            PuntoEntrega(id=3, latitud=4.7400, longitud=-74.1000, peso=2)
        ]
        
        matriz_tiempos = [
            [0, 60, 90, 100],
            [60, 0, 50, 70],
            [90, 50, 0, 40],
            [100, 70, 40, 0]
        ]
        
        # Ruta: 1 -> 2 -> 3
        tiempo = service._OptimizationService__calcular_tiempo(
            paradas=[1, 2, 3],
            puntos_entrega=puntos,
            matriz_tiempos=matriz_tiempos
        )
        
        # Esperado: 0->1 (60) + 1->2 (50) + 2->3 (40) = 150
        assert tiempo == 150


class TestPuntosEntregaModels:
    """Pruebas del modelo PuntoEntrega"""
    
    def test_crear_punto_entrega_valido(self):
        """Test de creación correcta de un punto"""
        punto = PuntoEntrega(
            id=1,
            latitud=4.7200,
            longitud=-74.0800,
            peso=5
        )
        
        assert punto.id == 1
        assert punto.latitud == 4.7200
        assert punto.longitud == -74.0800
        assert punto.peso == 5


class TestCapacidadRepartidorModel:
    """Pruebas del modelo CapacidadRepartidor"""
    
    def test_crear_capacidad_con_alias(self):
        """Test que el alias 'idRepartidor' funciona"""
        capacidad = CapacidadRepartidor(
            idRepartidor=1,
            capacidadRepartidor=100
        )
        
        assert capacidad.id == 1
        assert capacidad.capacidad == 100
    
    def test_crear_capacidad_sin_alias(self):
        """Test que también funciona sin alias"""
        capacidad = CapacidadRepartidor(
            id=2,
            capacidad=50
        )
        
        assert capacidad.id == 2
        assert capacidad.capacidad == 50

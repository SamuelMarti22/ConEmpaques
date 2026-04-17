from platform import node
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from app.models.schema import PuntoEntrega, CapacidadRepartidor, RutaRepartidor, OptimizacionResponse
import logging

logger = logging.getLogger(__name__)

class RoutingService:
    def resolver_rutas(self, matriz: list[list[float]], puntos_entrega: list[PuntoEntrega], repartidores: list[CapacidadRepartidor] ) -> OptimizacionResponse:
        logger.info(f"Iniciando optimización con {len(puntos_entrega)} puntos y {len(repartidores)} repartidores")
        logger.info(f"Capacidades: {[r.capacidad for r in repartidores]}")
        logger.info(f"Pesos de puntos: {[p.peso for p in puntos_entrega]}")

        self.__validar_matriz(matriz, len(puntos_entrega))
        
        # Validaciones
        capacidad_total = sum(r.capacidad for r in repartidores)
        peso_total = sum(p.peso for p in puntos_entrega)
        logger.info(f"Capacidad total disponible: {capacidad_total}, Peso total a repartir: {peso_total}")
        
        if peso_total > capacidad_total:
            logger.error(f"ERROR: No hay suficiente capacidad. Necesitas {peso_total} pero solo tienes {capacidad_total}")
            return OptimizacionResponse(rutas=[])
            
        if not puntos_entrega:
            logger.warning("No hay puntos de entrega")
            return OptimizacionResponse(rutas=[])
            
        if not repartidores:
            logger.warning("No hay repartidores")
            return OptimizacionResponse(rutas=[])
          
        gerente = pywrapcp.RoutingIndexManager(len(matriz),len(repartidores),  0 )
        modelo = pywrapcp.RoutingModel(gerente)
    
        def distancia_entre_nodos(from_index, to_index):
            nodo_partida= gerente.IndexToNode(from_index)
            nodo_destino = gerente.IndexToNode(to_index)
            return int(matriz[nodo_partida][nodo_destino])
    
        transit_callback = modelo.RegisterTransitCallback(distancia_entre_nodos)
        modelo.SetArcCostEvaluatorOfAllVehicles(transit_callback)
    
        def peso_nodo(from_index):
            nodo = gerente.IndexToNode(from_index)
            if nodo == 0:
                return 0  
            return int(puntos_entrega[nodo - 1].peso)

        capacidad_callback = modelo.RegisterUnaryTransitCallback(peso_nodo)
        modelo.AddDimensionWithVehicleCapacity(capacidad_callback,0,[int(v.capacidad) for v in repartidores],True,"Capacidad")
    
        parametros = pywrapcp.DefaultRoutingSearchParameters()
        parametros.first_solution_strategy = (routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
        parametros.local_search_metaheuristic = (routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
        parametros.time_limit.seconds = 30

        solucion = modelo.SolveWithParameters(parametros)
        
        logger.info(f"Status de solucion: {solucion}")
        if solucion:
            logger.info("Solución encontrada")
            return self.__extraer_rutas(solucion,modelo,gerente,repartidores,puntos_entrega, matriz)
        else:
            logger.warning("NO se encontró solución")
            return OptimizacionResponse(rutas=[])

    def __validar_matriz(self, matriz: list[list[float]], cantidad_puntos: int) -> None:
        tamano_esperado = cantidad_puntos + 1  # +1 por depósito en índice 0

        if not matriz or len(matriz) != tamano_esperado:
            raise ValueError("No se pudo construir una matriz de distancias válida para los puntos seleccionados.")

        for fila in matriz:
            if len(fila) != tamano_esperado:
                raise ValueError("La matriz de distancias tiene un tamaño inconsistente para los puntos seleccionados.")

        nodos_sin_conexion = []
        for nodo in range(1, tamano_esperado):
            fila = matriz[nodo]
            conexiones_validas = [distancia for indice, distancia in enumerate(fila) if indice != nodo and distancia is not None]
            if len(conexiones_validas) == 0:
                nodos_sin_conexion.append(nodo)

        if nodos_sin_conexion:
            raise ValueError(
                "Hay puntos de entrega sin conexión vial en el mapa. Verifica direcciones y vuelve a intentar."
            )

        if any(matriz[origen][destino] is None for origen in range(tamano_esperado) for destino in range(tamano_esperado) if origen != destino):
            raise ValueError(
                "OSRM reportó trayectos no alcanzables entre algunos puntos. Ajusta los puntos de entrega e intenta de nuevo."
            )

    def __extraer_rutas(self,solucion,modelo,gerente,repartidores: list[CapacidadRepartidor],puntos: list[PuntoEntrega],matriz: list[list[float]]) -> OptimizacionResponse:
        rutas = []
        for i, repartidor in enumerate(repartidores):
            paradas = []
            index = modelo.Start(i)
            while not modelo.IsEnd(index):
                nodo = gerente.IndexToNode(index)
                if nodo != 0:
                    paradas.append(puntos[nodo - 1].id)
                index = solucion.Value(modelo.NextVar(index))

            if paradas:
                distancia = self.__calcular_distancia_ruta(paradas, puntos, matriz)
                tiempo_estimado = self.__calcular_tiempo_estimado(distancia)
                logger.info(f"Repartidor {repartidor.id}: {len(paradas)} paradas, distancia: {distancia}m, tiempo: {tiempo_estimado}s")
                rutas.append(RutaRepartidor(repartidor_id=repartidor.id,ruta=paradas,distancia_total=distancia,tiempo_estimado=tiempo_estimado, geometria=[]))
            else:
                logger.debug(f"Repartidor {repartidor.id}: sin paradas asignadas")
            
        logger.info(f"Total de rutas generadas: {len(rutas)}")
        return OptimizacionResponse(rutas=rutas)
    
    def __calcular_distancia_ruta(self,paradas: list[int],puntos: list[PuntoEntrega],matriz: list[list[float]]) -> float:
        indice_por_id = {p.id: i + 1 for i, p in enumerate(puntos)}
        orden = [0] + [indice_por_id[id] for id in paradas]
        
        distancia_total = 0
        for i in range(len(orden) - 1):
            distancia_total += matriz[orden[i]][orden[i + 1]]
        
        return distancia_total
    
    def __calcular_tiempo_estimado(self, distancia_metros: float) -> float:
        # Velocidad promedio de entrega en ciudad: 40 km/h = 11.11 m/s
        # Fórmula: tiempo (segundos) = distancia (metros) / velocidad (m/s)
        velocidad_promedio_ms = 40 * 1000 / 3600  # 40 km/h en m/s
        tiempo_estimado = distancia_metros / velocidad_promedio_ms if distancia_metros > 0 else 0
        return tiempo_estimado
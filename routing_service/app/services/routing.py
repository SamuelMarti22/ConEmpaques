from platform import node
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from app.models.schema import PuntoEntrega, CapacidadRepartidor, RutaRepartidor, OptimizacionResponse

class RoutingService:
    def resolver_rutas(self, matriz: list[list[float]], puntos_entrega: list[PuntoEntrega], repartidores: list[CapacidadRepartidor] ) -> OptimizacionResponse:
          
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

        solucion = modelo.SolveWithParameters(parametros)
    
        rutas = self.__extraer_rutas(solucion,modelo,gerente,repartidores,puntos_entrega, matriz) if solucion else []
    
        return rutas

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
                    rutas.append(RutaRepartidor(repartidor_id=repartidor.id,ruta=paradas,distancia_total=self.__calcular_distancia_ruta(paradas, puntos, matriz),tiempo_estimado=0.0, geometria=[]))
            
        return OptimizacionResponse(rutas=rutas)
    
    def __calcular_distancia_ruta(self,paradas: list[int],puntos: list[PuntoEntrega],matriz: list[list[float]]) -> float:
        indice_por_id = {p.id: i + 1 for i, p in enumerate(puntos)}
        orden = [0] + [indice_por_id[id] for id in paradas]
        
        distancia_total = 0
        for i in range(len(orden) - 1):
            distancia_total += matriz[orden[i]][orden[i + 1]]
        
        return distancia_total
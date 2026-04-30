# 🚚 Con Empaques

## 📌 Introducción

Este sistema te permite gestionar la operación logística completa: desde la planificación de entregas hasta el monitoreo en tiempo real. Está diseñado para tres roles principales:

- **Logístico**: Planifica, genera rutas y supervisa la operación
- **Repartidor**: Ejecuta las entregas usando la app móvil
- **Cliente**: Consulta el estado de su pedido sin necesidad de registro

El flujo es lineal y predecible: planificas → ejecutas → monitoreas → analizas.

---

## 🎯 Antes de empezar: conceptos clave

- **Fecha de reparto**: Toda operación está ligada a una fecha. Los puntos se guardan por fecha específica en el navegador.
- **Puntos de entrega**: Son los pedidos con dirección, cliente y peso. Se crean antes de generar rutas.
- **Repartidores disponibles**: Solo participan en la generación de rutas si están marcados como disponibles y no cuentan con una ruta asignada en ese momento.
- **Estados de entrega**: Las entregas pasan por estados específicos que se actualizan en tiempo real.
- **Datos en tiempo real**: El mapa se actualiza automáticamente cuando hay cambios via WebSocket.

---

# ⚡ Flujo completo en 7 pasos

## 1️⃣ Registrar repartidores

**¿Por qué primero?** Porque sin repartidores no hay rutas que generar.

Ve al módulo de **Repartidores** y crea cada uno con:
- **Nombre** e identificación
- **Tipo de vehículo** (Moto, Carro, Bicicleta, etc.)
- **Capacidad de carga** (en kg)
- **Horario de operación** (si es relevante)
- **Estado: Disponible** o No disponible

⚠️ **Importante**: 
- Solo los repartidores marcados como "Disponible" aparecen en la generación de rutas
- Si un repartidor ya tiene ruta activa (estado: EN_PROCESO), se excluye automáticamente de nuevas asignaciones
- Puedes modificar la disponibilidad en cualquier momento antes de generar rutas

💡 Mantener este dato actualizado es crítico para la eficiencia del sistema.

---

## 2️⃣ Crear puntos de entrega para hoy

Ahora ve a **Planeación de Rutas** y selecciona la fecha en que harás las entregas (probablemente hoy).

En la sección de **Puntos de Entrega**, llena el formulario con:

- **Cliente**: Nombre o razón social (obligatorio)
- **Contacto**: Teléfono del cliente (obligatorio)
- **Dirección**: Tan específica como sea posible (obligatorio)
- **Código de seguimiento**: Para que el cliente consulte su pedido (se crea de forma automática)
- **Peso del producto**: En kg (obligatorio)
- **Descripción**: Qué se entrega (obligatorio)

Cuando escribas la dirección, el sistema la ubica en el mapa.

💡 **Cuidado con las direcciones**: Si están mal escritas o son muy vagas, el sistema las ubicará incorrectamente. Vale la pena revisarlas antes de generar rutas.

El sistema guarda estos puntos **por fecha**. Esto significa:
- Los puntos de hoy están separados de los de mañana
- Puedes cambiar de fecha y no "perderás" lo que habías creado
- Cuando recargues la página, los puntos de la fecha seleccionada se cargan automáticamente

---

🎥 Video: Preparación de la operación  
*https://youtu.be/VIDEO_PREPARACION*

---

## 3️⃣ Generar rutas (el corazón del sistema)

Una vez tengas repartidores disponibles y puntos de entrega listos, ve a **Generar Rutas**.

En ese momento el sistema hace todo automáticamente:

1. ✅ Analiza todos los puntos de entrega
2. ✅ Considera la capacidad de cada repartidor
3. ✅ **Optimiza los recorridos**
4. ✅ Distribuye los pedidos de forma eficiente
5. ✅ Define el **orden de entrega** para cada repartidor

El resultado: **rutas listas para ejecutar**, sin intervención manual.

Cuando la ruta ya quedó creada, la vas a ver en la sección de **Rutas asignadas**. Ahí puedes revisar las rutas del día que seleccionaste y elegir una en particular para verla sola en el mapa.

**Estados de la ruta después de generar:**
- 🟡 **PENDIENTE**: Ruta creada, esperando inicio
- 🟢 **EN_PROCESO**: Repartidor está en la ruta
- ✅ **ENTREGADA**: Todos los puntos fueron entregados

💡 Si algo cambia (un repartidor se queda sin disponibilidad, hay nuevos pedidos), simplemente genera rutas nuevamente. El sistema recalcula.

---

🎥 Video: Generación de rutas  
*https://youtu.be/VIDEO_PLANIFICACION*

---

## 4️⃣ Supervisar en el mapa (tu vista principal)

Después de generar rutas, ve a **Mapa de Rutas**.

Aquí es donde ves toda la operación en un vistazo:

**En el mapa verás:**
- 🔵 **Puntos de entrega** (cada uno con su estado visual)
- 📍 **Rutas trazadas** (líneas entre puntos optimizadas)
- 🚴 **Repartidores** (su posición actual en tiempo real)
- 🚩 **Destinos** (siguiente punto del repartidor)

**Estados de cada punto de entrega:**
- ⚪ **EN_BODEGA**: En bodega, pendiente de salida
- 🟡 **PENDIENTE**: Listo para entregar
- 🟠 **EN_ENTREGA**: Repartidor en camino al punto
- 🟢 **EN_CAMINO**: En la ruta general (similar a EN_ENTREGA)
- ✅ **ENTREGADO**: Completado exitosamente
- 🔴 **FALLIDO**: Hubo un problema (cliente no estaba, dirección incorrecta, etc.)

**Cómo usar esta vista:**
- Puedes mover el mapa y acercarlo o alejarlo
- Si haces clic en un punto, ves sus datos
- Si eliges una ruta o un repartidor, el mapa se enfoca solo en ese recorrido

💡 Usa esta pantalla para revisar cómo va el día. Si una ruta no avanza, conviene revisar con el repartidor.

---

🎥 Video: Supervisión en el mapa  
*https://youtu.be/VIDEO_MAPA_SUPERVISION*

---

## 5️⃣ Ejecución: el repartidor usa la app móvil

El repartidor abre su app (en el teléfono) y ve la **lista de entregas ordenadas** de ese día.

No tiene que pensar: simplemente sigue el orden que el sistema le propone.

### Cuando llega a un punto:

1. Selecciona el pedido en su lista
2. El sistema le muestra la dirección exacta y contacto del cliente
3. Confirma llegada → el punto cambia a **EN_ENTREGA**
4. Marca el resultado:
   - ✅ **ENTREGADO**: Se completó la entrega
   - ❌ **FALLIDO**: Hubo un problema (especifica el motivo)

### Opciones al marcar FALLIDO:
- Cliente no estaba
- Dirección incorrecta
- Pedido dañado
- Cliente rechazó
- Otro (especificar)

**En ese exacto momento:**
- ✅ El estado se actualiza en el sistema
- 📍 El logístico lo ve cambiar en el mapa al instante
- 📱 El cliente ve el cambio en su seguimiento
- 🔔 El cliente recibe una notificación de actualización

Todo se actualiza al momento.

💡 El repartidor no necesita reportar por WhatsApp, SMS o llamada. Todo queda registrado en la app.

---

🎥 Video: Ejecución del repartidor  
*https://youtu.be/VIDEO_REPARTIDOR*

---

## 6️⃣ Seguimiento en tiempo real: cliente y logístico

### 👨‍💼 Como logístico:

Te quedas en la vista de entregas viendo cómo se ejecuta el día. Desde ahí puedes revisar las rutas creadas para esa fecha y enfocarte en una sola si lo necesitas.

Vas viendo:
- 🚗 Movimiento de repartidores
- 📊 Cambios de estado
- 📈 Progreso general de la operación
- ⏱️ Tiempo estimado y avance real

Si algo se queda estancado, puedes revisarlo con el repartidor.

---

### 📦 Como cliente:

El cliente **no necesita cuenta de usuario**. Simplemente:

1. Va a la sección **Seguimiento**
2. Escribe el **código de seguimiento** del pedido
3. Ve en tiempo real:
   - 📍 Estado actual (En bodega / Pendiente / En entrega / Entregado / Fallido)
   - 🗺️ Ubicación aproximada del repartidor (sin revelar datos sensibles)
   - ⏰ Hora estimada de entrega
   - 🔔 Cambios en tiempo real

Todo público y sin autenticación. El cliente solo necesita el código que le diste.

**Estados que ve el cliente:**
- **En bodega**: Su pedido está siendo preparado
- **Pendiente**: En la ruta del repartidor, listo para entregar hoy
- **En camino**: El repartidor está en su zona
- **Entregado**: ✅ Pedido recibido
- **Fallido**: ⚠️ No se pudo entregar (verá el motivo)

---

🎥 Video: Seguimiento en tiempo real  
*https://youtu.be/VIDEO_TIEMPO_REAL*

---

## 7️⃣ Análisis posterior: dashboard e historial

Cuando la operación del día termina, ve a **Historial de Rutas** o **Dashboard**.

Aquí **no estás operando, estás analizando**:

**Verás:**
- 📊 Total de pedidos planeados vs entregados
- ✅ Tasa de éxito de entregas
- ⏱️ Tiempo promedio de entrega
- 🚴 Desempeño por repartidor
- 🛣️ Rutas completadas
- 📉 Puntos fallidos (con motivos)

**Puedes:**
- Filtrar por rango de fechas
- Comparar desempeño entre repartidores
- Revisar entregas fallidas y sus motivos
- Exportar reportes
- Identificar patrones

💡 Usa esto para identificar mejoras:
- ¿Dónde está el cuello de botella?
- ¿Qué repartidor es más eficiente?
- ¿Qué horarios tienen más entregas?
- ¿Qué zonas tienen más problemas?

---

🎥 Video: Análisis con Dashboard  
*https://youtu.be/VIDEO_DASHBOARD*

---

## ⚙️ Notas técnicas importantes

- **Almacenamiento local**: Los puntos que creas se guardan por fecha en tu navegador. Así no se mezclan con los de otros días.
- **Seguimiento público**: El cliente solo necesita el código de seguimiento para consultar su pedido.
- **Rutas guardadas**: Cuando una ruta ya fue creada, la puedes consultar luego en **Rutas asignadas** usando el día correspondiente.

---

## 🔗 Tips finales para máxima eficiencia

✅ **Antes de generar rutas:**
- Revisa bien las direcciones (geocodificación exacta es crítica)
- Confirma que los repartidores estén marcados como disponibles
- Verifica que la capacidad de carga sea realista
- Prueba con una pequeña cantidad primero si es primera vez

✅ **Durante la operación:**
- Usa el mapa como tu vista principal
- Crea alertas mentales si un repartidor está más de 10 min sin moverse
- Mantén tu teléfono a mano para recibir actualizaciones
- Si un cliente llama, dale el código de seguimiento para que vea el estado en vivo

✅ **Después de cada día:**
- Revisa el dashboard para identificar problemas
- Detecta patrones (horarios lentos, repartidores menos eficientes, zonas problemáticas)
- Ajusta la planificación para el próximo día
- Documenta entregas fallidas para seguimiento

✅ **Mantenimiento:**
- Actualiza regularmente disponibilidad de repartidores
- Verifica capacidades de vehículos
- Revisa zonas problemáticas periódicamente
- Mantén códigos de seguimiento únicos y fáciles

---

## ❓ Preguntas frecuentes

**P: ¿Qué pasa si un repartidor no está disponible?**  
R: No aparecerá en la generación de rutas. Marca como disponible antes de generar.

**P: ¿Puedo cambiar la fecha de una ruta después de crearla?**  
R: No. Debes eliminarla y crear una nueva con la fecha correcta.

**P: ¿Qué pasa si falla una entrega?**  
R: Se marca como FALLIDO con motivo. El cliente lo verá y puedes reintentar después.

**P: ¿Cuánto tiempo conserva el sistema los datos?**  
R: 30 días. Después se eliminan automáticamente para liberar espacio.

**P: ¿Necesito internet para usar la app del repartidor?**  
R: Sí, pero solo para sincronización inicial. El mapa funciona con GPS local.

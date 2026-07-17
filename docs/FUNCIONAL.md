# HIT TRACKER — Documentación Funcional

## ¿Qué es HIT TRACKER?

HIT TRACKER es una app móvil Android para monitorizar entrenamientos de boxeo en tiempo real. Un sensor ESP32 colocado en el saco detecta los golpes vía Bluetooth y la app registra intensidad, frecuencia y evolución a lo largo de las rondas.

La app también incluye un módulo de entrenamiento físico completo (calentamiento, core y boxeo) con planes personalizables y un catálogo de ejercicios integrado con la base de datos pública wger.

---

## Pantallas Principales

### 1. Inicio (Dashboard)

La pantalla de inicio muestra el estado global del entrenamiento:

- **Estado del sensor**: si hay un sensor BLE conectado y el perfil de calibración activo
- **Tu poder**: media de powerMax de las últimas 5 sesiones con el perfil activo
- **Gráfico de progreso**: barras de HPM y línea de potencia de las últimas 8 sesiones
- **Sesiones recientes**: lista de sesiones del perfil activo, ordenada de más reciente a más antigua, con fecha, rondas y stats principales
- **Botón Nueva sesión**: acceso rápido a la configuración de una sesión de boxeo directa

Toca cualquier sesión para ver su detalle completo.

---

### 2. Sesión (Sesión de boxeo directa)

Flujo completo de una sesión de boxeo:

#### Configuración

Antes de empezar se configura:

| Parámetro | Opciones | Descripción |
|---|---|---|
| Duración de ronda | 60 / 120 / 180 / 300 s | Tiempo por ronda; 0 = modo libre |
| Número de rondas | 1 / 3 / 5 / 8 | Total de rondas |
| Descanso | 10 / 20 / 30 / 60 / 90 s | Tiempo entre rondas |
| Perfil | Seleccionable | Umbral y sensibilidad de detección |
| Modo libre | Toggle | El timer sube en lugar de bajar; el usuario termina cada ronda manualmente |

El botón **Empezar** está deshabilitado si no hay sensor BLE conectado.

#### Durante la sesión

```
Preparación (10s) → Ronda → Descanso → Ronda → ... → Resultados
```

**Preparación**: cuenta atrás de 10 segundos con señales de audio (beep en 3s/2s/1s, campana de inicio de ronda al llegar a 0).

**Durante la ronda** se muestran en tiempo real:
- Timer de la ronda (cuenta atrás o arriba en modo libre)
- Número de ronda / total de rondas
- Total de golpes en la ronda
- Potencia máxima (powerMax)
- HPM actual y promedio
- Gráfico en vivo de intensidad por golpe
- Combo asignado al round (si el plan tiene scripts)

**Fin de ronda**: en los últimos 10s suena un tick de cuenta atrás y en el segundo 1 un aviso final; al llegar a 0 suena una campana — distinta según si quedan más rondas (campana de descanso) o era la última (campana de fin de sesión).

**Durante el descanso**:
- Cuenta atrás del descanso con beeps en 3s/2s/1s
- Stats de la ronda que acaba de terminar
- Comparativa con la ronda anterior (tendencia)
- Indicador de fatiga si la segunda mitad fue notablemente más floja

#### Resultados

Al finalizar todas las rondas:
- Stats totales: golpes, powerMax, HPM medio
- Stats por ronda con gráfico de evolución
- Botón **Compartir** — genera una imagen con el resumen + texto para redes sociales

---

### 3. Entrenamiento (Módulo de planes)

El módulo de entrenamiento permite crear y ejecutar planes estructurados que combinan ejercicios físicos con boxeo.

#### Lista de planes

Pantalla principal del módulo. Muestra todos los planes guardados con su nombre y duración estimada. Desde aquí se puede:
- **Crear un plan** nuevo
- **Editar** un plan existente
- **Ejecutar** un plan
- **Eliminar** un plan
- Acceder al **Catálogo** de ejercicios
- Buscar ejercicios en **wger** (base de datos pública)

#### Crear / Editar un plan

El formulario tiene cuatro secciones:

1. **Nombre** del plan
2. **Calentamiento**: selección de ejercicios del catálogo (categoría warmup/mobility)
3. **Core**: selección de ejercicios del catálogo (categoría core/fullbody)
4. **Boxeo**: configuración de rondas (duración, número, descanso) y combos por round

Los combos por round son opcionales. Si se asignan, aparecen en pantalla durante la ronda de boxeo.

#### Ejecutar un plan

El plan se ejecuta en tres fases consecutivas:

```
Calentamiento (WorkoutPlayer) → Core (WorkoutPlayer) → Boxeo (rondas)
```

Si el plan no tiene ejercicios en calentamiento o core, esa fase se omite automáticamente.

**WorkoutPlayer** (fases de ejercicio físico):
- Muestra el ejercicio actual con nombre, descripción y músculos trabajados
- Timer de cuenta atrás (o indicador de reps si el ejercicio es por repeticiones)
- Barra de progreso del plan
- Botones: **Siguiente**, **Saltar ejercicio**, **Abandonar**
- Entre ejercicios: pantalla de descanso con cuenta atrás

**Fase de boxeo**: igual que una sesión directa pero usando la configuración del plan. Si no hay sensor BLE conectado, la fase de boxeo funciona igualmente (sin datos de golpes, solo el timer).

#### Catálogo de ejercicios

Tres tabs: **Calentamiento**, **Core/Fullbody**, **Boxing**.

- Búsqueda por texto en tiempo real
- Ejercicios del catálogo base + ejercicios custom añadidos por el usuario
- Toca un ejercicio para ver su detalle (músculos, equipo, descripción)
- Botón **Añadir ejercicio** en cada tab para crear ejercicios custom de esa categoría
- Los ejercicios custom pueden eliminarse desde su detalle

#### Búsqueda wger

Busca ejercicios en la base de datos pública [wger.de](https://wger.de):
- Introduce un término de búsqueda (ej: "push up", "squat", "plank")
- Resultados paginados a 20 por página
- Toca un resultado para ver el detalle completo
- Botón **Importar** — añade el ejercicio a tu catálogo local
- Los ejercicios importados aparecen en el catálogo con los demás

---

### 4. Dispositivos

Gestión de sensores BLE:

- **Escanear**: busca sensores ESP32 cercanos (filtra por UUID de servicio de HIT TRACKER)
- **Vincular**: añade el sensor a la lista de dispositivos guardados
- **Conectar / Desconectar**: gestiona la conexión activa
- **Eliminar**: borra un dispositivo de la lista

Solo puede haber un sensor conectado a la vez. El sensor conectado se muestra en el Dashboard y es el que se usa en las sesiones.

---

### 5. Perfiles

Un perfil de calibración define cómo interpreta la app los datos del sensor:

| Parámetro | Descripción |
|---|---|
| **Threshold** | Umbral base de detección. Golpes por debajo no se registran |
| **Sensitivity** | Escala de intensidad. A más sensitivity, más diferencia entre golpes suaves y fuertes |
| **Rebound** | Cooldown entre golpes (ms). Calculado por el wizard con datos reales del saco |

#### Perfiles

- Se puede tener múltiples perfiles (ej: uno por tipo de saco, uno por persona)
- El **perfil activo** es el que se usa en las sesiones y en el Dashboard
- Hay un perfil **Default** que no puede eliminarse
- Al eliminar un perfil se pide confirmación: el borrado elimina también todas las sesiones guardadas de ese perfil, de forma irreversible

#### Wizard de calibración

Flujo guiado para calibrar el perfil a tu saco específico:

1. **Golpes ligeros**: golpea el saco varias veces con poca intensidad
2. **Golpes fuertes**: golpea el saco varias veces con máxima intensidad
3. La app analiza los datos y sugiere threshold, sensitivity y rebound automáticamente
4. Revisa y confirma (o ajusta manualmente antes de guardar)

El wizard captura `HitWindows` reales (pico + duración del rebote) para ajustar los parámetros al comportamiento físico específico de cada saco.

#### Ajuste manual

Los parámetros también pueden ajustarse manualmente en cualquier momento desde el formulario de edición del perfil.

---

## Conceptos Clave

### Golpe (Impact)

Un golpe se registra cuando el sensor detecta que la magnitud de la aceleración supera el umbral y luego desciende (pico confirmado). Cada golpe tiene:

- **Intensidad (0-100)**: qué tan fuerte fue en relación al rango calibrado
- **Magnitud raw**: valor bruto del sensor en el momento del golpe

### HPM (Hits Per Minute)

- **HPM actual**: golpes en los últimos 10 segundos × 6
- **HPM promedio**: total de golpes / minutos transcurridos

### Fatiga

Una ronda se marca como **fatigada** si la media de intensidad de la segunda mitad de golpes es inferior al 85% de la media de la primera mitad.

### Modo Libre

En modo libre (`roundDuration = 0`) el timer sube en lugar de bajar. El usuario termina cada ronda manualmente cuando quiera. Útil para sparring, trabajo técnico o cuando no se quiere presión de tiempo.

### Sensor ESP32 (Hardware)

El sensor debe colocarse en el **punto de anclaje** del saco (donde hay menos oscilación):

| Tipo de saco | Posición |
|---|---|
| Saco colgado | Cerca del enganche superior |
| Saco de pie | Base inferior, periférico al mástil |

Versiones del firmware:
- **V2**: envía un stream continuo de datos — la app detecta golpes por software
- **V3**: el firmware detecta los golpes y solo envía eventos de golpe — menor consumo y latencia

---

## Compartir Sesión

Al finalizar una sesión (directa o dentro de un plan), el botón **Compartir** genera:
- Una imagen PNG con el resumen visual de la sesión
- Un texto con los stats principales listo para redes sociales

El texto tiene el formato:
```
¡Vaya sesión! X min y una media de Y HPM. ¡A tope! 💪
#hittracker #boxing #training
```

---

## Persistencia

Todos los datos se guardan localmente en el dispositivo:

| Datos | Descripción |
|---|---|
| Sesiones | Una sesión por fichero JSON |
| Perfiles | Fichero único con todos los perfiles |
| Dispositivos | Fichero único con todos los dispositivos guardados |
| Planes | Fichero único con todos los planes de entrenamiento |
| Ejercicios custom | Fichero único con ejercicios personalizados e importados de wger |

No hay sincronización en la nube ni cuenta de usuario. Todos los datos son locales al dispositivo.

# HIT TRACKER V1 — Guía de Conexión Completa

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Hardware:** ESP32 DevKit V1 + MPU-6050 + TP4056 + LM2596  
**Plataforma:** Prototipo DIY con breadboard

---

## 📋 Lista de Componentes

### Alimentación y regulación
| Componente | Cantidad | Modelo | Función |
|---|---|---|---|
| Batería 18650 | 1 | Tenpower INR18650-26ME 2600mAh | Fuente de energía |
| Portapilas | 1 | 1×18650 con cable | Alojar batería |
| Módulo carga | 1 | TP4056 con protección DW01 | Cargar + proteger batería |
| Regulador buck | 1 | LM2596 (4V-40V IN, 3.3V OUT ajustable) | Bajar a 3.3V |
| Capacitor | 2 | 1000µF 25V | Filtrado TP4056 OUT + LM2596 OUT |
| Mini cargador USB | 1 | Para 18650 (backup) | Carga alternativa |

### Microcontrolador y sensor
| Componente | Cantidad | Modelo | Función |
|---|---|---|---|
| ESP32 DevKit V1 | 1 | 30 pines | Microcontrolador |
| Sensor acelerómetro | 1 | MPU-6050 (GY-521) | Detectar impactos |
| Breadboard | 1 | 830 holes | Prototipado sin soldar |

### Indicadores visuales
| Componente | Cantidad | Especificación | GPIO | Función |
|---|---|---|---|---|
| LED 5mm Rojo | 1 | Ánodo largo, cátodo corto | GPIO 2 | Encendido (siempre ON) |
| LED 5mm Azul | 1 | Ánodo largo, cátodo corto | GPIO 4 | BLE conectado (parpadea) |
| LED 5mm Verde | 1 | Ánodo largo, cátodo corto | GPIO 15 | Reserva |
| LED 5mm Amarillo | 1 | Ánodo largo, cátodo corto | GPIO 13 | Golpe detectado (destello) |
| Resistor | 4 | 220Ω (del kit 220R 10pcs) | — | Limitador corriente LEDs |

### Cableado
| Componente | Cantidad | Tipo | Color (sugerido) | Uso |
|---|---|---|---|---|
| Cable AWG24 multifilar | 2m | Rojo | Rojo | VCC (+) |
| Cable AWG24 multifilar | 2m | Negro | Negro | GND (-) |
| Cable AWG24 multifilar | 2m | Verde | Verde | I2C SDA (datos) |
| Cable AWG24 multifilar | 2m | Azul | Azul | I2C SCL (reloj) |
| Cable Dupont M-M | 10 | Hembra-hembra | Varios | Breadboard |
| Cable Dupont F-M | 10 | Hembra-macho | Varios | ESP32 a breadboard |

### Herramientas
| Herramienta | Cantidad | Función |
|---|---|---|
| Soldador (60W mín) | 1 | Soldar cables a módulos |
| Estaño Sn60/Pb40 | ~30g | Soldadura |
| Termoretractil | Varios | Aislar conexiones soldadas |
| Pinza / Destornillador pequeño | 1 | Manipular componentes |

---

## 🔌 Esquema General

```
Portapilas 18650 (3.7-4.2V)
        ↓
   TP4056 Carga
   ├─ Entrada: USB 5V
   ├─ Batería: B+/B-
   └─ OUT: 4.2V
        ↓
   LM2596 Buck Converter
   ├─ Entrada: 4.2V (TP4056 OUT)
   ├─ Potenciómetro: calibrado a 3.3V
   └─ OUT: 3.3V (regulado)
        ↓
   ESP32 DevKit V1 (3.3V)
   ├─ GPIO 21 ↔ MPU-6050 SDA (I2C datos)
   ├─ GPIO 22 ↔ MPU-6050 SCL (I2C reloj)
   ├─ GPIO 2  ↔ LED Rojo (encendido)
   ├─ GPIO 4  ↔ LED Azul (BLE)
   ├─ GPIO 15 ↔ LED Verde (reserva)
   └─ GPIO 13 ↔ LED Amarillo (golpes)   ← GPIO 35 es input-only, usar GPIO 13

GND COMÚN: conecta todos los "-" en un punto
```

---

## 🛠️ Procedimiento de conexión

### Fase 1: Alimentación (SOLDAR)

**Objetivo:** Conectar portapilas → TP4056 → LM2596 → ESP32

1. **Suelda cable rojo AWG24** desde:
   - Portapilas (+) → TP4056 pin B+

2. **Suelda cable negro AWG24** desde:
   - Portapilas (-) → punto GND común

3. **Capacitor C1 (1000µF):**
   - Entre TP4056 OUT+ y GND (muy cerca del módulo, ≤2cm)
   - Pata larga (+) → TP4056 OUT+
   - Pata corta (-) → GND común

4. **Suelda cable rojo AWG24** desde:
   - TP4056 OUT+ → LM2596 IN+

5. **Suelda cable negro AWG24** desde:
   - TP4056 OUT- → GND común

6. **Capacitor C2 (1000µF):**
   - Entre LM2596 OUT+ y GND (muy cerca del módulo)
   - Pata larga (+) → LM2596 OUT+
   - Pata corta (-) → GND común

7. **Suelda cable rojo AWG24** desde:
   - LM2596 OUT+ → ESP32 pin 3.3V

8. **Suelda cable negro AWG24** desde:
   - LM2596 OUT- → GND común

**Verificación Fase 1:**
```
✅ Portapilas rojo conecta a TP4056 B+
✅ Portapilas negro conecta a GND común
✅ TP4056 OUT (rojo/negro) conecta a LM2596 IN (rojo/negro)
✅ LM2596 OUT (rojo) conecta a ESP32 3.3V
✅ Capacitores en paralelo en TP4056 OUT y LM2596 OUT
✅ Todos los GND en un punto común
```

---

### Fase 2: Calibración LM2596

**CRÍTICO:** Antes de conectar el ESP32, ajustar LM2596 a 3.3V exactos.

1. **Desconecta todo del ESP32.**

2. **Conecta USB al TP4056** (sin batería si quieres probar primero).

3. **Mira el display del LM2596:**
   - Mostrará "entrada: 4.2V" (aproximado)
   - La salida aún no está calibrada

4. **Localiza el potenciómetro pequeño** del LM2596 (tornillo azul, cara superior).

5. **Gira lentamente el potenciómetro** mientras observas el display:
   - **Objetivo:** que la salida (OUT) muestre **3.3V**
   - Gira hacia la derecha = aumenta voltaje
   - Gira hacia la izquierda = disminuye voltaje

6. **Una vez en 3.3V:**
   - Desconecta USB
   - **NO MUEVAS EL POTENCIÓMETRO** de aquí en adelante
   - Procede a conectar ESP32

**Nota importante:** El display muestra entrada/salida simultáneamente. Busca el valor de **salida (OUT)** en 3.3V.

---

### Fase 3: Sensor MPU-6050 (Breadboard + Dupont)

**Objetivo:** Conectar acelerómetro via I2C

En la **breadboard**:

1. **Enchufa el ESP32** en la breadboard (fila central, pines hacia afuera).

2. **Enchufa el MPU-6050** en otra sección de la breadboard.

3. **Conexiones de potencia (cable rojo/negro):**
   - ESP32 3.3V pin → cable rojo Dupont M-F → breadboard fila A
   - MPU-6050 VCC → cable rojo Dupont M-M → breadboard fila A
   - (Ambos en la misma fila = conectados)

   - ESP32 GND pin → cable negro Dupont M-F → breadboard fila B
   - MPU-6050 GND → cable negro Dupont M-M → breadboard fila B

4. **Conexiones I2C (cable verde/azul):**
   - ESP32 GPIO 21 → cable verde Dupont M-F → breadboard fila C
   - MPU-6050 SDA → cable verde Dupont M-M → breadboard fila C

   - ESP32 GPIO 22 → cable azul Dupont M-F → breadboard fila D
   - MPU-6050 SCL → cable azul Dupont M-M → breadboard fila D

**Verificación Fase 3:**
```
✅ MPU-6050 VCC recibe 3.3V
✅ MPU-6050 GND conectado a GND común
✅ GPIO 21 (SDA) conectado a MPU SDA
✅ GPIO 22 (SCL) conectado a MPU SCL
```

---

### Fase 4: LEDs con resistores (Breadboard)

**Objetivo:** 4 LEDs indicadores con limitador de corriente

Para **cada LED:**

1. **Enchufa resistor 220Ω** en la breadboard (fila E para rojo, fila F para azul, etc).

2. **Conexión para LED Rojo (GPIO 2, encendido):**
   - ESP32 GPIO 2 → cable amarillo Dupont M-F → breadboard
   - Resistor 220Ω → LED Rojo (pata larga/ánodo)
   - LED Rojo (pata corta/cátodo) → cable negro Dupont → GND común

   **Secuencia en breadboard:**
   ```
   Fila E: [cable GPIO 2] [Resistor 220Ω] [LED +]
   Fila F: [LED -] [cable GND]
   ```

3. **Conexión para LED Azul (GPIO 4, BLE):**
   - ESP32 GPIO 4 → cable Dupont M-F → Resistor 220Ω
   - Resistor → LED Azul (+)
   - LED Azul (-) → GND común

4. **Conexión para LED Verde (GPIO 15, reserva):**
   - ESP32 GPIO 15 → cable Dupont M-F → Resistor 220Ω
   - Resistor → LED Verde (+)
   - LED Verde (-) → GND común

5. **Conexión para LED Amarillo (GPIO 13, golpes):**
   > ⚠️ GPIO 35 en ESP32 DevKit V1 es input-only — no puede controlar una carga. Usar GPIO 13.
   - ESP32 GPIO 13 → cable Dupont M-F → Resistor 220Ω
   - Resistor → LED Amarillo (+)
   - LED Amarillo (-) → GND común

**Verificación Fase 4:**
```
✅ Cada LED tiene un resistor 220Ω en serie
✅ LED pata larga (+) va a resistor
✅ LED pata corta (-) va a GND común
✅ 4 LEDs en GPIO 2, 4, 15, 13 (no GPIO 35 — es input-only)
```

---

## ✅ Verificación Final

### Checklist visual

```
□ Portapilas: rojo en TP4056 B+, negro en GND
□ TP4056: USB 5V enchufado, LED de carga parpadeando
□ Capacitor C1: entre TP4056 OUT+ y GND
□ LM2596: display mostrando "OUT: 3.3V" (calibrado)
□ Capacitor C2: entre LM2596 OUT+ y GND
□ ESP32: recibiendo 3.3V y GND desde LM2596
□ MPU-6050: conectado via I2C en GPIO 21/22
□ 4 LEDs: enchufados en breadboard con resistores 220Ω
□ Todos los GND en un punto común
```

### Encendida

1. **Desconecta USB del TP4056.**

2. **Conecta batería 18650** al portapilas (pata (+) roja primero).

3. **Espera 2 segundos** — LM2596 debería estabilizar.

4. **Conecta USB para programar el ESP32** (o para verificación):
   - TP4056 cargará la batería
   - LM2596 entregará 3.3V constante
   - ESP32 debería encender

**Comportamiento esperado:**
- TP4056: LED de carga parpadea (cargando)
- ESP32: encendido (si tienes firmware)
- LEDs: se comportarán según el código (por ahora no harán nada)

---

## 🔧 Troubleshooting

### ESP32 no enciende

| Problema | Causa probable | Solución |
|---|---|---|
| **Sin voltaje en 3.3V pin** | Fallo LM2596 | Verifica potenciómetro en 3.3V con multímetro |
| **Voltaje alto (>3.5V)** | LM2596 mal calibrado | Recalibra potenciómetro |
| **Voltaje bajo (<3V)** | Cable flojo | Revisa conexión rojo/negro TP4056 → LM2596 |
| **Intermitente** | Capacitor defectuoso | Prueba swapping C1 o C2 |

### MPU-6050 no responde (I2C)

| Problema | Causa probable | Solución |
|---|---|---|
| **No detecta en escaneo I2C** | Pines GPIO 21/22 invertidos | Verifica etiquetas ESP32 |
| **Conexión floja** | Cables Dupont mal enchufados | Reenchufa en breadboard |
| **Voltaje bajo** | C2 defectuoso | Prueba sin capacitor temporalmente |

### LEDs no encienden

| Problema | Causa probable | Solución |
|---|---|---|
| **LED oscuro** | Pata corta no en GND | Verifica conexión cátodo (-) a GND |
| **LED débil** | Resistor incorrecto | Verifica 220Ω (no 2.2k, no 22Ω) |
| **Polarity invertida** | Patas de LED invertidas | Intercambia pata larga/corta |

### Capacitor se hincha

| Síntoma | Causa | Acción |
|---|---|---|
| **Capacitor abombado o rebentado** | Voltaje inverso o excesivo | **REEMPLAZAR INMEDIATAMENTE** |
| **Humo/olor** | Cortocircuito | **APAGAR Y REVISAR CONEXIONES** |

---

## 📐 Medidas y tolerancias

| Parámetro | Rango seguro | Rango crítico |
|---|---|---|
| Voltaje ESP32 | 3.2V - 3.4V | < 3V o > 3.6V |
| Corriente GPIO (cada LED) | 10-20mA | > 40mA (daña pin) |
| Voltaje batería | 3.6V - 4.2V | < 3.5V (baja) o > 4.3V (exceso) |
| Temperatura (funcionamiento) | 0°C - 50°C | > 60°C (apagar) |

---

## 🎯 Próximos pasos

1. **Firmware:** Grabar código Arduino/ESP-IDF en el ESP32
2. **BLE:** Configurar Bluetooth Low Energy
3. **Detección de golpes:** Algoritmo en `useSensorData.ts`
4. **App móvil:** React Native con conexión BLE
5. **Persistencia:** Guardar sesiones en JSON local

---

## 📞 Notas finales

- **Soldador:** Usa soldador 60W mín, punta fina. Tiempo de contacto < 3 segundos por punto.
- **Termoretractil:** Protege todas las soldaduras con tubo termoretractil para evitar cortocircuitos.
- **Cables:** AWG24 multifilar es obligatorio; el cable sólido (AWG22) rompe en breadboard.
- **GND común:** Un único punto de referencia (GND) para toda la electrónica. No hagas dos o tres GND separados.
- **Documentación:** Esta guía es para V1. V2/V3 añadirán SD, botones, LEDs direccionables.

---

**¿Preguntas?** Revisa el esquema visual o abre un issue en el repositorio.

**Versión:** 1.0 | **Última actualización:** Junio 2026

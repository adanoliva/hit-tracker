# HIT TRACKER — Sensor V2 (Batería + LEDs)

Evolución del prototipo V1 (breadboard + USB). V2 es un sensor autónomo con batería integrada, carga USB-C y LEDs indicadores de estado. El firmware es idéntico al de V1 — el único añadido es la gestión de los LEDs.

---

## Cambios respecto a V1

| Aspecto | V1 | V2 |
|---|---|---|
| Alimentación | USB (cable) | Batería LiPo 1000 mAh |
| Carga | Por USB del ordenador | Puerto USB-C dedicado (TP4056) |
| Encendido | Siempre encendido si hay cable | Interruptor on/off físico |
| Feedback visual | Ninguno | LEDs indicadores de estado |
| Botón de acción | No | No (llega en V3) |
| PCB | Breadboard | PCB personalizada compacta |
| Montaje | Bridas / cinta provisional | Fijación definitiva al saco |

---

## Componentes

### 1. ESP32 + GY-521 (igual que V1)

Ver `SENSOR-TECNICO-V1.md` para especificaciones completas.

### 2. Batería LiPo

| Especificación | Valor |
|---|---|
| Capacidad | 1000 mAh (recomendado) |
| Voltaje | 3.7V nominal |
| Conector | JST PH 2.0 |
| Tiempo estimado | ~6-8 horas a 80 mA |

### 3. Módulo de carga LiPo — TP4056

| Especificación | Valor |
|---|---|
| Chip | TP4056 (con protección) |
| Entrada | USB-C 5V |
| Corriente de carga | 1A máx |
| Protección | Sobrecarga, sobredescarga, cortocircuito |
| Voltaje de salida | 3.7-4.2V |

> Usar el módulo TP4056 **con protección integrada** (tiene 6 pines, no 4). El de 4 pines no protege la batería.

### 4. Interruptor on/off

| Tipo | Descripción |
|---|---|
| Interruptor deslizante | Simple, barato, sin riesgo de activación accidental |

El interruptor va en serie entre la salida del TP4056 y el VIN del ESP32. Con él en OFF el sensor no consume nada de batería.

### 5. LEDs indicadores

Dos LEDs recomendados:

| LED | Color | Función |
|---|---|---|
| Estado BLE | Azul | Indica conexión / actividad BLE |
| Batería | Rojo | Batería baja |

---

## Diagrama de Conexión

```
                    ┌─────────────────────────────┐
                    │         BATERÍA LiPo         │
                    │         3.7V / 1000mAh       │
                    └────────┬────────┬────────────┘
                             │+       │-
                    ┌────────▼────────▼────────────┐
                    │       TP4056 + protección     │
                    │  USB-C ──→ IN   BAT ──→ LiPo │
                    │            OUT+ / OUT-        │
                    └────────┬────────┬────────────┘
                             │+       │-
                    ┌────────▼────────▼────────────┐
                    │    INTERRUPTOR ON/OFF         │
                    └────────┬────────┬────────────┘
                             │        │
                    ┌────────▼────────▼────────────┐
                    │            ESP32              │
                    │  GPIO 21 ──→ SDA (MPU-6050)  │
                    │  GPIO 22 ──→ SCL (MPU-6050)  │
                    │  GPIO  2 ──→ LED azul (BLE)  │
                    │  GPIO 4  ──→ LED rojo (bat)  │
                    └───────────────────────────────┘
                                    │ I2C
                    ┌───────────────▼───────────────┐
                    │         GY-521 (MPU-6050)     │
                    └───────────────────────────────┘
```

### Pines ESP32 — V2

| GPIO | Función |
|---|---|
| 21 | SDA (I2C → MPU-6050) |
| 22 | SCL (I2C → MPU-6050) |
| 2 | LED azul — estado BLE |
| 4 | LED rojo — batería baja |
| - | 3.3V → VCC MPU-6050 |
| - | GND compartido |

> Los LEDs necesitan resistencia en serie (~220Ω a 3.3V).

---

## Firmware — Cambios respecto a V1

El firmware de V2 es el de V1 con el añadido de la gestión de LEDs. No hay botón de acción en V2.

El único cambio en la sección de identidad es `SENSOR_VERSION`:

```cpp
#define SENSOR_VERSION 2   // indica a la app que es hardware V2
```

```cpp
#define LED_BLE_PIN  2   // azul — estado BLE
#define LED_BAT_PIN  4   // rojo — batería baja

void setup() {
  // ... setup existente de V1 ...

  pinMode(LED_BLE_PIN, OUTPUT);
  pinMode(LED_BAT_PIN, OUTPUT);

  digitalWrite(LED_BLE_PIN, LOW);
  digitalWrite(LED_BAT_PIN, LOW);
}
```

### Gestión de LEDs en el loop

```cpp
void updateLEDs() {
  // LED azul: estado BLE
  if (deviceConnected) {
    // Parpadeo lento = conectado
    digitalWrite(LED_BLE_PIN, (millis() / 1000) % 2);
  } else {
    // Encendido fijo = esperando conexión
    digitalWrite(LED_BLE_PIN, HIGH);
  }

  // LED rojo: batería baja (lectura ADC del pin de batería del TP4056)
  // El TP4056 expone CHRG y STDBY; si ambos están en HIGH = batería baja
  // Alternativa: leer voltaje de batería con divisor resistivo en GPIO34
}

void loop() {
  updateLEDs();
  // ... loop existente de V1 ...
}
```

### Estados del LED azul (BLE)

| Estado | LED azul |
|---|---|
| Encendido, sin conexión BLE | Encendido fijo |
| Conectado vía BLE | Parpadeo lento (1s) |
| Transmitiendo datos activamente | Parpadeo rápido (100ms) |

### LED rojo (batería)

El TP4056 expone dos pines de estado (`CHRG` y `STDBY`) que se pueden leer desde el ESP32, o alternativamente medir el voltaje de la batería con un divisor resistivo en un pin ADC. Cuando el voltaje cae por debajo de ~3.5V, encender el LED rojo fijo como aviso.

---

## PCB — Consideraciones de diseño

- Dimensiones objetivo: < 50mm x 40mm
- Puerto USB-C en el borde de la placa (carga sin abrir carcasa)
- Interruptor on/off accesible desde el exterior
- LEDs visibles desde fuera de la carcasa (guías de luz o agujeros)
- Dejar footprint para el botón de acción de V3 aunque no se pueble en V2

---

## Problemas comunes — Nuevos en V2

| Problema | Causa | Solución |
|---|---|---|
| Sensor no enciende con batería | TP4056 sin protección o batería descargada | Verificar módulo con 6 pines; cargar batería |
| Batería se descarga rápido | BLE advertising continuo en reposo | Implementar deep sleep cuando no hay cliente |
| LED siempre apagado | Pin incorrecto, resistencia faltante o lógica invertida | Verificar pin, resistencia en serie y nivel activo |

---

## Referencias adicionales

- [TP4056 Datasheet](https://dlnmh9ip6v2uc.cloudfront.net/datasheets/Prototyping/TP4056.pdf)
- [ESP32 Deep Sleep](https://randomnerdtutorials.com/esp32-deep-sleep-arduino-ide-wake-up-sources/)
- Ver `SENSOR-TECNICO-V1.md` para firmware base completo
- Ver `SENSOR-TECNICO-V3.md` para la incorporación del botón de acción y SD

/**
 * HIT TRACKER - Simulador de sensor ESP32
 * Uso: node tools/mock-sensor.mjs [--port=7331]
 *
 * Patrón: tandas de 4-6 golpes (con tipo realista), luego pausa ~5s
 */

import { createServer } from 'http'
import { WebSocketServer } from 'ws'

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] })
)
const PORT = parseInt(args.port ?? '7331')

// Características por tipo de golpe
// ax > 0 = derecha, ax < 0 = izquierda
// |gz| > 80 = hook
const PUNCH_PROFILES = {
  'jab':        { axSign:  1, gzBase:   20, gzNoise: 30 },  // derecha directo
  'cross':      { axSign: -1, gzBase:   20, gzNoise: 30 },  // izquierda directo
  'right-hook': { axSign:  1, gzBase:  120, gzNoise: 40 },  // derecha gancho
  'left-hook':  { axSign: -1, gzBase: -120, gzNoise: 40 },  // izquierda gancho
}

// Combos típicos de boxeo
const COMBO_PATTERNS = [
  ['jab', 'cross'],
  ['jab', 'cross', 'left-hook'],
  ['jab', 'jab', 'cross'],
  ['cross', 'left-hook'],
  ['jab', 'cross', 'right-hook', 'left-hook'],
  ['jab', 'cross', 'jab'],
]

// --- HTTP ---
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  } else {
    res.writeHead(404); res.end()
  }
})

const wss = new WebSocketServer({ server })

// Cola de picos pendientes: { peak, riseMs, fallMs, axSign, gzBase, gzNoise }
let pendingPeaks = []
let activeHit    = null

const TICK_MS      = 20
const BASELINE_MAG = 3.5
const BASE_NOISE   = 0.4

const startTime = Date.now()

function scheduleBurst() {
  const combo   = COMBO_PATTERNS[Math.floor(Math.random() * COMBO_PATTERNS.length)]
  const gapMs   = 320 + Math.random() * 180   // 320-500ms entre golpes
  const pauseMs = 4500 + Math.random() * 1500  // 4.5-6s pausa entre tandas

  combo.forEach((punchType, i) => {
    const profile = PUNCH_PROFILES[punchType]
    setTimeout(() => {
      pendingPeaks.push({
        peak:   20 + Math.random() * 55,
        riseMs: 20 + Math.random() * 20,
        fallMs: 55 + Math.random() * 55,
        ...profile
      })
    }, i * gapMs)
  })

  setTimeout(scheduleBurst, combo.length * gapMs + pauseMs)
}

function generateReading(timestamp) {
  let magnitude = BASELINE_MAG + (Math.random() - 0.5) * BASE_NOISE
  let axSign = 0
  let gzBase = 0
  let gzNoise = 20

  if (activeHit) {
    const { peak, riseMs, fallMs } = activeHit
    const t = activeHit.elapsed
    axSign  = activeHit.axSign
    gzBase  = activeHit.gzBase
    gzNoise = activeHit.gzNoise

    if (t < riseMs) {
      magnitude = BASELINE_MAG + (peak - BASELINE_MAG) * (t / riseMs)
    } else if (t < riseMs + fallMs) {
      const decay = (t - riseMs) / fallMs
      magnitude = peak - (peak - BASELINE_MAG) * decay
    } else {
      activeHit = null
    }

    if (activeHit) activeHit.elapsed += TICK_MS
  } else if (pendingPeaks.length > 0) {
    activeHit = { ...pendingPeaks.shift(), elapsed: 0 }
  }

  const ratio = magnitude / BASELINE_MAG
  // ax refleja el lado del golpe, con ruido proporcional a la fuerza
  const ax = axSign !== 0
    ? axSign * (1.5 + Math.random() * ratio * 0.8)
    : (Math.random() - 0.5) * 1.5

  return {
    timestamp,
    ax: parseFloat(ax.toFixed(3)),
    ay: parseFloat(((Math.random() - 0.5) * 1.5).toFixed(3)),
    az: parseFloat((magnitude * 0.85 + (Math.random() - 0.5) * 0.5).toFixed(3)),
    gx: parseFloat(((Math.random() - 0.5) * ratio * 30).toFixed(2)),
    gy: parseFloat(((Math.random() - 0.5) * ratio * 20).toFixed(2)),
    gz: parseFloat((gzBase + (Math.random() - 0.5) * gzNoise).toFixed(2)),
    magnitude: parseFloat(magnitude.toFixed(3))
  }
}

setInterval(() => {
  if (wss.clients.size === 0) return
  const reading = generateReading(Date.now() - startTime)
  const msg = JSON.stringify(reading)
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg)
  }
}, TICK_MS)

wss.on('connection', (ws) => {
  console.log(`[mock] Cliente conectado (${wss.clients.size} total)`)
  ws.on('close', () => console.log(`[mock] Cliente desconectado (${wss.clients.size} total)`))
})

server.listen(PORT, () => {
  console.log(`\n🥊 HIT TRACKER Mock Sensor`)
  console.log(`   HTTP → http://localhost:${PORT}/health`)
  console.log(`   WS   → ws://localhost:${PORT}`)
  console.log(`   Combos: jab/cross/hooks en tandas de ${COMBO_PATTERNS.map(c=>c.length).join('/')} golpes\n`)
  scheduleBurst()
})

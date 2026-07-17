import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

const SOUNDS = {
  oneBell:       require('../../assets/sounds/one-bell.mp3') as number,
  twoBell:       require('../../assets/sounds/two-bell.mp3') as number,
  threeBell:     require('../../assets/sounds/three-bell.mp3') as number,
  beep:          require('../../assets/sounds/beep.mp3') as number,
  countdownTick: require('../../assets/sounds/timer_countdown-once.mp3') as number,
  countdownEnd:  require('../../assets/sounds/timer_countdown-end.mp3') as number,
}

// ponytail: players precargados para evitar el delay de decode al primer play() de cada uno
const players = Object.fromEntries(
  Object.entries(SOUNDS).map(([key, asset]) => [key, createAudioPlayer(asset)])
) as Record<keyof typeof SOUNDS, ReturnType<typeof createAudioPlayer>>

function play(key: keyof typeof SOUNDS) {
  try {
    const player = players[key]
    player.seekTo(0)
    player.play()
  } catch {}
}

async function enableDucking() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })
  } catch {}
}

export const audioService = {
  oneBell:   () => play('oneBell'),
  twoBell:   () => play('twoBell'),
  threeBell: () => play('threeBell'),
  beep:      () => play('beep'),
  countdownTick: () => play('countdownTick'),
  countdownEnd:  () => play('countdownEnd'),
  enableDucking,
}

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

const SOUNDS = {
  oneBell:       require('../../assets/sounds/one-bell.mp3') as number,
  twoBell:       require('../../assets/sounds/two-bell.mp3') as number,
  threeBell:     require('../../assets/sounds/three-bell.mp3') as number,
  beep:          require('../../assets/sounds/beep.mp3') as number,
  countdownTick: require('../../assets/sounds/timer_countdown-once.mp3') as number,
  countdownEnd:  require('../../assets/sounds/timer_countdown-end.mp3') as number,
}

function play(key: keyof typeof SOUNDS) {
  try {
    createAudioPlayer(SOUNDS[key]).play()
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

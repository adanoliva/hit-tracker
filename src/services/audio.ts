import { createAudioPlayer } from 'expo-audio'

const SOUNDS = {
  bell:      require('../../assets/sounds/opening-bell.mp3') as number,
  beep:      require('../../assets/sounds/beep.mp3') as number,
  countdown: require('../../assets/sounds/timer_countdown.mp3') as number,
}

function play(key: keyof typeof SOUNDS, rate = 1.0) {
  try {
    const player = createAudioPlayer(SOUNDS[key])
    if (rate !== 1.0) player.setPlaybackRate(rate)
    player.play()
  } catch {}
}

export const audioService = {
  bell:      () => play('bell'),
  beep:      () => play('beep'),
  longBeep:  () => play('beep', 0.5),
  countdown: () => play('countdown'),
}

import { Audio } from 'expo-av'

const SOUNDS = {
  bell:      require('../../assets/sounds/opening-bell.mp3'),
  beep:      require('../../assets/sounds/beep.mp3'),
  countdown: require('../../assets/sounds/timer_countdown.mp3'),
}

async function play(key: keyof typeof SOUNDS, rate = 1.0) {
  try {
    const { sound } = await Audio.Sound.createAsync(SOUNDS[key], { shouldPlay: true, rate })
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync()
    })
  } catch {}
}

export const audioService = {
  bell:      () => play('bell'),
  beep:      () => play('beep'),
  longBeep:  () => play('beep', 0.5),
  countdown: () => play('countdown'),
}

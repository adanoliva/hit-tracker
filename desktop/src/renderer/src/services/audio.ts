const cache = new Map<string, HTMLAudioElement>()

function get(path: string): HTMLAudioElement {
  if (!cache.has(path)) cache.set(path, new Audio(path))
  return cache.get(path)!
}

function play(path: string, playbackRate = 1) {
  const a = get(path)
  a.currentTime = 0
  a.playbackRate = playbackRate
  a.play().catch(() => {})
}

export const audioService = {
  bell:      () => play('/sounds/opening-bell.mp3'),
  beep:      () => play('/sounds/beep.mp3'),
  longBeep:  () => play('/sounds/beep.mp3', 0.5),
  countdown: () => play('/sounds/timer_countdown.mp3'),
}

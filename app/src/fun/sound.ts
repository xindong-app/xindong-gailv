// 音效 —— WebAudio 合成, 无外部音频文件; 默认开启, 可随时关闭
// 偏好存 localStorage(纯 UI 偏好, 不含任何筛选数据)
const STORAGE_KEY = 'xindong.fun.sound'

let ctx: AudioContext | null = null

export function isSoundOn(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch { /* 隐私模式下静默失败 */ }
  if (on) ensureContext()
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function noiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}

/** 刀光剑影: 噪声扫频 + 高频「唰」 */
export function playSlash(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    const noise = context.createBufferSource()
    noise.buffer = noiseBuffer(context, 0.28)
    const bandpass = context.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.Q.value = 1.2
    bandpass.frequency.setValueAtTime(2800, now)
    bandpass.frequency.exponentialRampToValueAtTime(420, now + 0.24)
    const noiseGain = context.createGain()
    noiseGain.gain.setValueAtTime(0.0001, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.22, now + 0.03)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26)
    noise.connect(bandpass).connect(noiseGain).connect(context.destination)
    noise.start(now)
    noise.stop(now + 0.28)

    const shing = context.createOscillator()
    shing.type = 'triangle'
    shing.frequency.setValueAtTime(1400, now)
    shing.frequency.exponentialRampToValueAtTime(240, now + 0.18)
    const shingGain = context.createGain()
    shingGain.gain.setValueAtTime(0.0001, now)
    shingGain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
    shingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    shing.connect(shingGain).connect(context.destination)
    shing.start(now)
    shing.stop(now + 0.2)
  } catch { /* 音频设备不可用时静默 */ }
}

/** 新关卡开启: 两声轻快的「叮」 */
export function playLevelUp(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    ;[523.25, 784].forEach((freq, index) => {
      const osc = context.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const gain = context.createGain()
      const start = now + index * 0.09
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      osc.connect(gain).connect(context.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
  } catch { /* 静默 */ }
}

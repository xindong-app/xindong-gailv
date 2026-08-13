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

/** 揭榜开奖: 三连上行 + 终音, 小小的仪式感 */
export function playTada(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    ;[392, 523.25, 659.25, 784].forEach((freq, index) => {
      const osc = context.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const gain = context.createGain()
      const start = now + index * 0.11
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.11, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (index === 3 ? 0.7 : 0.22))
      osc.connect(gain).connect(context.destination)
      osc.start(start)
      osc.stop(start + 0.75)
    })
  } catch { /* 静默 */ }
}

/** 点 chip: 一声短促的「啵」, 选条件上瘾音 */
export function playPop(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    const osc = context.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(540, now)
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.07)
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
    osc.connect(gain).connect(context.destination)
    osc.start(now)
    osc.stop(now + 0.13)
  } catch { /* 音频设备不可用时静默 */ }
}

/** 盖章: 低频「砰」+ 一点纸面摩擦 */
export function playStamp(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    const thud = context.createOscillator()
    thud.type = 'square'
    thud.frequency.setValueAtTime(160, now)
    thud.frequency.exponentialRampToValueAtTime(64, now + 0.1)
    const thudGain = context.createGain()
    thudGain.gain.setValueAtTime(0.0001, now)
    thudGain.gain.exponentialRampToValueAtTime(0.18, now + 0.014)
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
    thud.connect(thudGain).connect(context.destination)
    thud.start(now)
    thud.stop(now + 0.17)

    const paper = context.createBufferSource()
    paper.buffer = noiseBuffer(context, 0.08)
    const lowpass = context.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 900
    const paperGain = context.createGain()
    paperGain.gain.setValueAtTime(0.0001, now)
    paperGain.gain.exponentialRampToValueAtTime(0.07, now + 0.01)
    paperGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
    paper.connect(lowpass).connect(paperGain).connect(context.destination)
    paper.start(now)
    paper.stop(now + 0.09)
  } catch { /* 静默 */ }
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

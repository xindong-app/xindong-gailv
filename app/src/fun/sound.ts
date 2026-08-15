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

/** 翻关: 一页纸翻过去的轻「唰」 */
export function playWhoosh(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    const noise = context.createBufferSource()
    noise.buffer = noiseBuffer(context, 0.22)
    const bandpass = context.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.Q.value = 0.9
    bandpass.frequency.setValueAtTime(520, now)
    bandpass.frequency.exponentialRampToValueAtTime(1650, now + 0.17)
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    noise.connect(bandpass).connect(gain).connect(context.destination)
    noise.start(now)
    noise.stop(now + 0.22)
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

/** 财神爷彩蛋: 小金锣 —— 金属双音 + 亮噪, 敲一下财气到外溢 */
export function playCaishen(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    ;[659.25, 987.77].forEach((freq) => {
      const osc = context.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)
      osc.connect(gain).connect(context.destination)
      osc.start(now)
      osc.stop(now + 0.95)
    })
    const shine = context.createBufferSource()
    shine.buffer = noiseBuffer(context, 0.3)
    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 3200
    const shineGain = context.createGain()
    shineGain.gain.setValueAtTime(0.0001, now)
    shineGain.gain.exponentialRampToValueAtTime(0.05, now + 0.01)
    shineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
    shine.connect(highpass).connect(shineGain).connect(context.destination)
    shine.start(now)
    shine.stop(now + 0.32)
  } catch { /* 静默 */ }
}

/** 团灭(逻辑空集): 低频「咚」+ 长尾空场回音 —— 灯灭了 */
export function playWipeout(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    const boom = context.createOscillator()
    boom.type = 'sine'
    boom.frequency.setValueAtTime(110, now)
    boom.frequency.exponentialRampToValueAtTime(38, now + 0.7)
    const boomGain = context.createGain()
    boomGain.gain.setValueAtTime(0.0001, now)
    boomGain.gain.exponentialRampToValueAtTime(0.2, now + 0.02)
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1)
    boom.connect(boomGain).connect(context.destination)
    boom.start(now)
    boom.stop(now + 1.15)

    const hall = context.createBufferSource()
    hall.buffer = noiseBuffer(context, 1.2)
    const lowpass = context.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.setValueAtTime(700, now)
    lowpass.frequency.exponentialRampToValueAtTime(140, now + 1.1)
    const hallGain = context.createGain()
    hallGain.gain.setValueAtTime(0.0001, now)
    hallGain.gain.exponentialRampToValueAtTime(0.06, now + 0.05)
    hallGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)
    hall.connect(lowpass).connect(hallGain).connect(context.destination)
    hall.start(now)
    hall.stop(now + 1.25)
  } catch { /* 静默 */ }
}

/** 人群氛围: 一刀之后幸存量越少, 嗡嗡声越轻越短 —— 听得见的人数 */
export function playCrowdMurmur(ratio: number): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  const safe = Math.min(1, Math.max(0, ratio))
  try {
    const now = context.currentTime
    const seconds = 0.25 + safe * 0.55
    const noise = context.createBufferSource()
    noise.buffer = noiseBuffer(context, seconds)
    const bandpass = context.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.Q.value = 0.6
    bandpass.frequency.value = 320 + safe * 480
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.015 + safe * 0.05, now + 0.06)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
    noise.connect(bandpass).connect(gain).connect(context.destination)
    noise.start(now)
    noise.stop(now + seconds + 0.02)
  } catch { /* 静默 */ }
}

/** 翻卡: 一声上扬的纸面滑扫 + 落定轻「嗒」 */
export function playCardFlip(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    const sweep = context.createBufferSource()
    sweep.buffer = noiseBuffer(context, 0.18)
    const bandpass = context.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.Q.value = 1.4
    bandpass.frequency.setValueAtTime(900, now)
    bandpass.frequency.exponentialRampToValueAtTime(2600, now + 0.16)
    const sweepGain = context.createGain()
    sweepGain.gain.setValueAtTime(0.0001, now)
    sweepGain.gain.exponentialRampToValueAtTime(0.07, now + 0.03)
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
    sweep.connect(bandpass).connect(sweepGain).connect(context.destination)
    sweep.start(now)
    sweep.stop(now + 0.2)

    const tap = context.createOscillator()
    tap.type = 'sine'
    tap.frequency.value = 1900
    const tapGain = context.createGain()
    tapGain.gain.setValueAtTime(0.0001, now + 0.15)
    tapGain.gain.exponentialRampToValueAtTime(0.08, now + 0.16)
    tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
    tap.connect(tapGain).connect(context.destination)
    tap.start(now + 0.15)
    tap.stop(now + 0.26)
  } catch { /* 静默 */ }
}

/** 梦幻联动: 三连上行琶音 + 一点亮噪 —— 条件合体, combo 达成 */
export function playCombo(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    ;[523.25, 659.25, 1046.5].forEach((freq, index) => {
      const osc = context.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const gain = context.createGain()
      const start = now + index * 0.08
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.1, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
      osc.connect(gain).connect(context.destination)
      osc.start(start)
      osc.stop(start + 0.45)
    })
    const shine = context.createBufferSource()
    shine.buffer = noiseBuffer(context, 0.25)
    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 3600
    const shineGain = context.createGain()
    shineGain.gain.setValueAtTime(0.0001, now + 0.2)
    shineGain.gain.exponentialRampToValueAtTime(0.04, now + 0.22)
    shineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
    shine.connect(highpass).connect(shineGain).connect(context.destination)
    shine.start(now + 0.2)
    shine.stop(now + 0.47)
  } catch { /* 静默 */ }
}

/** 撕卡: 一截干脆的纸面撕裂噪声, 音高下坠 */
export function playTear(): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    const now = context.currentTime
    const tear = context.createBufferSource()
    tear.buffer = noiseBuffer(context, 0.3)
    const bandpass = context.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.Q.value = 0.8
    bandpass.frequency.setValueAtTime(2800, now)
    bandpass.frequency.exponentialRampToValueAtTime(700, now + 0.26)
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
    tear.connect(bandpass).connect(gain).connect(context.destination)
    tear.start(now)
    tear.stop(now + 0.32)
  } catch { /* 静默 */ }
}

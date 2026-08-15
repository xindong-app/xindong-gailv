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
  if (on) {
    ensureContext()
    startBgm()
  } else {
    stopBgm()
  }
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

/** 统一演奏入口: 音效开关 + 上下文 + 设备不可用时静默 */
function run(play: (context: AudioContext, now: number) => void): void {
  if (!isSoundOn()) return
  const context = ensureContext()
  if (!context) return
  try {
    play(context, context.currentTime)
  } catch { /* 音频设备不可用时静默 */ }
}

interface ToneOptions {
  type?: OscillatorType
  freq: number
  /** 有滑音时给到目标频率 */
  slideTo?: number
  slideT?: number
  vol: number
  attack?: number
  /** 增益归零时刻(相对发音起点, 秒) */
  decay: number
  /** 相对 now 的延迟(秒) */
  at?: number
}

function tone(context: AudioContext, now: number, o: ToneOptions): void {
  const start = now + (o.at ?? 0)
  const osc = context.createOscillator()
  osc.type = o.type ?? 'sine'
  if (o.slideTo != null) {
    osc.frequency.setValueAtTime(o.freq, start)
    osc.frequency.exponentialRampToValueAtTime(o.slideTo, start + (o.slideT ?? o.decay))
  } else {
    osc.frequency.value = o.freq
  }
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(o.vol, start + (o.attack ?? 0.02))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + o.decay)
  osc.connect(gain).connect(context.destination)
  osc.start(start)
  osc.stop(start + o.decay + 0.05)
}

interface NoiseOptions {
  filter: BiquadFilterType
  q?: number
  freq: number
  slideTo?: number
  slideT?: number
  vol: number
  attack?: number
  /** 增益归零时刻(相对发音起点, 秒) */
  dur: number
  at?: number
}

function noise(context: AudioContext, now: number, o: NoiseOptions): void {
  const start = now + (o.at ?? 0)
  const src = context.createBufferSource()
  src.buffer = noiseBuffer(context, o.dur + 0.02)
  const filter = context.createBiquadFilter()
  filter.type = o.filter
  if (o.q != null) filter.Q.value = o.q
  if (o.slideTo != null) {
    filter.frequency.setValueAtTime(o.freq, start)
    filter.frequency.exponentialRampToValueAtTime(o.slideTo, start + (o.slideT ?? o.dur))
  } else {
    filter.frequency.value = o.freq
  }
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(o.vol, start + (o.attack ?? 0.03))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + o.dur)
  src.connect(filter).connect(gain).connect(context.destination)
  src.start(start)
  src.stop(start + o.dur + 0.02)
}

/** 刀光剑影: 噪声扫频 + 高频「唰」 */
export function playSlash(): void {
  run((c, now) => {
    noise(c, now, { filter: 'bandpass', q: 1.2, freq: 2800, slideTo: 420, slideT: 0.24, vol: 0.22, dur: 0.26 })
    tone(c, now, { type: 'triangle', freq: 1400, slideTo: 240, slideT: 0.18, vol: 0.08, decay: 0.2 })
  })
}

/** 揭榜开奖: 三连上行 + 终音, 小小的仪式感 */
export function playTada(): void {
  run((c, now) => {
    [392, 523.25, 659.25, 784].forEach((freq, index) => {
      tone(c, now, { type: 'triangle', freq, vol: 0.11, decay: index === 3 ? 0.7 : 0.22, at: index * 0.11 })
    })
  })
}

/** 翻关: 一页纸翻过去的轻「唰」 */
export function playWhoosh(): void {
  run((c, now) => {
    noise(c, now, { filter: 'bandpass', q: 0.9, freq: 520, slideTo: 1650, slideT: 0.17, vol: 0.08, attack: 0.04, dur: 0.2 })
  })
}

/** 点 chip: 一声短促的「啵」, 选条件上瘾音 */
export function playPop(): void {
  run((c, now) => {
    tone(c, now, { freq: 540, slideTo: 920, slideT: 0.07, vol: 0.14, attack: 0.012, decay: 0.12 })
  })
}

/** 盖章: 低频「砰」+ 一点纸面摩擦 */
export function playStamp(): void {
  run((c, now) => {
    tone(c, now, { type: 'square', freq: 160, slideTo: 64, slideT: 0.1, vol: 0.18, attack: 0.014, decay: 0.16 })
    noise(c, now, { filter: 'lowpass', freq: 900, vol: 0.07, attack: 0.01, dur: 0.08 })
  })
}

/** 新关卡开启: 两声轻快的「叮」 */
export function playLevelUp(): void {
  run((c, now) => {
    [523.25, 784].forEach((freq, index) => {
      tone(c, now, { freq, vol: 0.12, attack: 0.015, decay: 0.35, at: index * 0.09 })
    })
  })
}

/** 财神爷彩蛋: 小金锣 —— 金属双音 + 亮噪, 敲一下财气到外溢 */
export function playCaishen(): void {
  run((c, now) => {
    ;[659.25, 987.77].forEach((freq) => {
      tone(c, now, { type: 'triangle', freq, vol: 0.1, attack: 0.008, decay: 0.9 })
    })
    noise(c, now, { filter: 'highpass', freq: 3200, vol: 0.05, attack: 0.01, dur: 0.3 })
  })
}

/** 团灭(逻辑空集): 低频「咚」+ 长尾空场回音 —— 灯灭了 */
export function playWipeout(): void {
  run((c, now) => {
    tone(c, now, { freq: 110, slideTo: 38, slideT: 0.7, vol: 0.2, decay: 1.1 })
    noise(c, now, { filter: 'lowpass', freq: 700, slideTo: 140, slideT: 1.1, vol: 0.06, attack: 0.05, dur: 1.2 })
  })
}

/** 人群氛围: 一刀之后幸存量越少, 嗡嗡声越轻越短 —— 听得见的人数 */
export function playCrowdMurmur(ratio: number): void {
  const safe = Math.min(1, Math.max(0, ratio))
  run((c, now) => {
    noise(c, now, { filter: 'bandpass', q: 0.6, freq: 320 + safe * 480, vol: 0.015 + safe * 0.05, attack: 0.06, dur: 0.25 + safe * 0.55 })
  })
}

/** 翻卡: 一声上扬的纸面滑扫 + 落定轻「嗒」 */
export function playCardFlip(): void {
  run((c, now) => {
    noise(c, now, { filter: 'bandpass', q: 1.4, freq: 900, slideTo: 2600, slideT: 0.16, vol: 0.07, dur: 0.18 })
    tone(c, now, { freq: 1900, vol: 0.08, attack: 0.01, decay: 0.09, at: 0.15 })
  })
}

/** 梦幻联动: 三连上行琶音 + 一点亮噪 —— 条件合体, combo 达成 */
export function playCombo(): void {
  run((c, now) => {
    [523.25, 659.25, 1046.5].forEach((freq, index) => {
      tone(c, now, { type: 'triangle', freq, vol: 0.1, attack: 0.015, decay: 0.4, at: index * 0.08 })
    })
    noise(c, now, { filter: 'highpass', freq: 3600, vol: 0.04, attack: 0.02, dur: 0.25, at: 0.2 })
  })
}

/** 撕卡: 一截干脆的纸面撕裂噪声, 音高下坠 */
export function playTear(): void {
  run((c, now) => {
    noise(c, now, { filter: 'bandpass', q: 0.8, freq: 2800, slideTo: 700, slideT: 0.26, vol: 0.11, attack: 0.015, dur: 0.3 })
  })
}

// ---------- 背景音乐: 马戏团圆舞曲(八小节循环, 现场合成, 无音频文件) ----------
// 3/4 蹦擦擦: 三角波低音打拍, 八音盒旋律飘在上面; 跟随音效总开关, 页面隐藏时自动暂停
const BGM_BEAT = 0.55 // 每拍秒数, 一小节三拍
// 八小节和弦根音: C G Am F / C F G C
const BGM_ROOTS = [130.81, 98, 110, 87.31, 130.81, 87.31, 98, 130.81]
// 每小节三拍的八音盒旋律(null = 休止)
const BGM_MELODY: (number | null)[][] = [
  [659.25, null, 784],
  [587.33, null, 493.88],
  [523.25, null, 659.25],
  [440, 523.25, 698.46],
  [784, null, 659.25],
  [880, null, 698.46],
  [587.33, 784, 987.77],
  [1046.5, null, null],
]
let bgmTimer: number | null = null
let bgmBar = 0
let bgmNext = 0
let bgmVisibilityWired = false

function playBgmBar(): void {
  if (!isSoundOn()) {
    stopBgm()
    return
  }
  const context = ensureContext()
  if (!context) return
  // 固定节拍时间轴, 不受 setInterval 抖动影响
  const now = Math.max(context.currentTime + 0.05, bgmNext)
  bgmNext = now + BGM_BEAT * 3
  const root = BGM_ROOTS[bgmBar % 8]
  // 蹦 · 擦 擦
  tone(context, now, { type: 'triangle', freq: root, vol: 0.055, decay: 0.5 })
  tone(context, now, { type: 'triangle', freq: root * 1.5, vol: 0.036, decay: 0.28, at: BGM_BEAT })
  tone(context, now, { type: 'triangle', freq: root * 1.5, vol: 0.036, decay: 0.28, at: BGM_BEAT * 2 })
  // 八音盒旋律
  BGM_MELODY[bgmBar % 8].forEach((freq, beat) => {
    if (freq != null) {
      tone(context, now, { freq, vol: 0.04, attack: 0.01, decay: 1.1, at: beat * BGM_BEAT })
    }
  })
  bgmBar += 1
}

/** 开园背景音乐; 浏览器自动播放策略要求首次交互后调用才出声 */
export function startBgm(): void {
  if (bgmTimer != null || !isSoundOn()) return
  if (typeof document !== 'undefined' && !bgmVisibilityWired) {
    bgmVisibilityWired = true
    // 切后台自动静音, 回前台继续营业
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopBgm()
      else startBgm()
    })
  }
  playBgmBar()
  bgmTimer = window.setInterval(playBgmBar, BGM_BEAT * 3 * 1000)
}

export function stopBgm(): void {
  if (bgmTimer != null) window.clearInterval(bgmTimer)
  bgmTimer = null
}

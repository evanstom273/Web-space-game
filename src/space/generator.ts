import type { SystemData } from './types'

export function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const SPACE_PALETTES = [
  { primary: '#b04cff', secondary: '#ff5baf', haze: '#54266f', haze2: '#1c315f', fog: '#180f2d', ambient: '#8550b6', grade: '#d46cff' },
  { primary: '#27d9d2', secondary: '#5c83ff', haze: '#134f61', haze2: '#31265f', fog: '#091f2b', ambient: '#47a9b7', grade: '#5dded6' },
  { primary: '#ff7b46', secondary: '#ef4e91', haze: '#6f3029', haze2: '#4f174f', fog: '#2a101c', ambient: '#c45c67', grade: '#ff8a62' },
  { primary: '#8fdc4a', secondary: '#38cfc1', haze: '#345d2b', haze2: '#134e52', fog: '#10251c', ambient: '#65aa68', grade: '#98e96c' },
  { primary: '#6975ff', secondary: '#ae64ff', haze: '#263768', haze2: '#4a245c', fog: '#10162f', ambient: '#6870bd', grade: '#8a8dff' },
  { primary: '#e8b64b', secondary: '#ff7758', haze: '#66532d', haze2: '#6b2e2b', fog: '#291d12', ambient: '#b98c4e', grade: '#ffc45e' },
]

export function makeSystem(seed: number): SystemData {
  const r = rng(seed)
  const rockyPalette = ['#6fb9dd', '#d98563', '#75b88b', '#a982c7', '#c6b06f', '#b96565', '#6ab9b0', '#8e969d']
  const gasPalette = ['#d6a86d', '#78a9c4', '#b98e70', '#8d91c7', '#c5b77e', '#769b94']
  const starPalette = ['#fff2c7', '#ffd19a', '#d8e8ff', '#fff0dc', '#cfe1ff']
  const spacePalette = SPACE_PALETTES[Math.floor(r() * SPACE_PALETTES.length)]
  const count = 4 + Math.floor(r() * 5)
  const planets = []
  let distance = 8

  for (let i = 0; i < count; i++) {
    distance += 4.5 + r() * 5.5
    const kind = r() < 0.28 ? 'gas' as const : 'rocky' as const
    const size = kind === 'gas' ? 1.35 + r() * 1.5 : 0.55 + r() * 1.15
    const palette = kind === 'gas' ? gasPalette : rockyPalette
    const color = palette[Math.floor(r() * palette.length)]
    const secondaryColor = palette[Math.floor(r() * palette.length)]

    const moonChance = kind === 'gas' ? 0.8 : 0.47
    const maxMoons = kind === 'gas' ? 4 : 2
    const moonCount = r() < moonChance ? 1 + Math.floor(r() * maxMoons) : 0
    const moons = Array.from({ length: moonCount }, (_, m) => ({
      distance: size + 1.05 + m * 0.82 + r() * 0.45,
      size: 0.14 + r() * 0.34,
      speed: 0.22 + r() * 0.62,
      phase: r() * Math.PI * 2,
      color: ['#9da7ae', '#b4aaa0', '#7f8990', '#b9b8ac'][Math.floor(r() * 4)],
    }))

    const atmosphere = r() < (kind === 'gas' ? 0.94 : 0.66)
      ? {
          color: r() < 0.55 ? spacePalette.primary : spacePalette.secondary,
          strength: 0.52 + r() * 0.5,
        }
      : undefined

    const ring = r() < (kind === 'gas' ? 0.46 : 0.1)
      ? {
          inner: size * (1.45 + r() * 0.18),
          outer: size * (2.05 + r() * 0.65),
          color: ['#cdbf9f', '#91a6b5', '#a69a8d', '#d7d0b3'][Math.floor(r() * 4)],
          opacity: 0.34 + r() * 0.34,
          tilt: -0.5 + r(),
        }
      : undefined

    planets.push({
      distance,
      size,
      speed: 0.022 + r() * 0.055,
      phase: r() * Math.PI * 2,
      color,
      secondaryColor,
      kind,
      moons,
      atmosphere,
      ring,
    })
  }

  const nebulaCountRoll = r()
  const nebulaCount = nebulaCountRoll < 0.08 ? 0 : nebulaCountRoll < 0.68 ? 1 : 2
  const vividness = 0.72 + r() * 0.38

  return {
    seed,
    starColor: starPalette[Math.floor(r() * starPalette.length)],
    starSize: 2.8 + r() * 1.8,
    planets,
    environment: {
      nebulaCount,
      nebulaPrimary: spacePalette.primary,
      nebulaSecondary: spacePalette.secondary,
      nebulaDensity: 0.38 + r() * 0.42,
      nebulaRotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
      galacticBandStrength: r() < 0.14 ? 0 : 0.18 + r() * 0.42,
      galacticBandRotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
      starDensity: 0.7 + r() * 0.72,
      dustDensity: 0.62 + r() * 0.8,
      hazeColor: spacePalette.haze,
      hazeSecondary: spacePalette.haze2,
      hazeStrength: (0.22 + r() * 0.34) * vividness,
      fogColor: spacePalette.fog,
      fogDensity: 0.0036 + r() * 0.0028,
      ambientColor: spacePalette.ambient,
      ambientIntensity: 0.055 + r() * 0.06,
      gradeColor: spacePalette.grade,
      gradeStrength: 0.055 + r() * 0.075,
      bloomStrength: 0.42 + r() * 0.2,
      bloomRadius: 0.5 + r() * 0.16,
      bloomThreshold: 0.62 + r() * 0.12,
    },
  }
}

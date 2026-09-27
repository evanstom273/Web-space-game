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

function hsl(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`
}

export function makeSystem(seed: number): SystemData {
  const r = rng(seed)
  const rockyPalette = ['#6fb9dd', '#d98563', '#75b88b', '#a982c7', '#c6b06f', '#b96565', '#6ab9b0', '#8e969d']
  const gasPalette = ['#d6a86d', '#78a9c4', '#b98e70', '#8d91c7', '#c5b77e', '#769b94']
  const starPalette = ['#fff2c7', '#ffd19a', '#d8e8ff', '#fff0dc', '#cfe1ff']
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

    const atmosphere = r() < (kind === 'gas' ? 0.9 : 0.58)
      ? {
          color: hsl(r() * 360, 55 + r() * 25, 60 + r() * 18),
          strength: 0.45 + r() * 0.45,
        }
      : undefined

    const ring = r() < (kind === 'gas' ? 0.42 : 0.09)
      ? {
          inner: size * (1.45 + r() * 0.18),
          outer: size * (2.05 + r() * 0.65),
          color: ['#cdbf9f', '#91a6b5', '#a69a8d', '#d7d0b3'][Math.floor(r() * 4)],
          opacity: 0.3 + r() * 0.3,
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

  const nebulaHue = r() * 360
  const nebulaCountRoll = r()
  const nebulaCount = nebulaCountRoll < 0.18 ? 0 : nebulaCountRoll < 0.76 ? 1 : 2

  return {
    seed,
    starColor: starPalette[Math.floor(r() * starPalette.length)],
    starSize: 2.8 + r() * 1.8,
    planets,
    environment: {
      nebulaCount,
      nebulaPrimary: hsl(nebulaHue, 65 + r() * 20, 38 + r() * 13),
      nebulaSecondary: hsl((nebulaHue + 45 + r() * 90) % 360, 62 + r() * 24, 34 + r() * 15),
      nebulaDensity: 0.2 + r() * 0.48,
      nebulaRotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
      galacticBandStrength: r() < 0.22 ? 0 : 0.12 + r() * 0.36,
      galacticBandRotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
      starDensity: 0.62 + r() * 0.7,
      dustDensity: 0.45 + r() * 0.75,
    },
  }
}

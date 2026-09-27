export type MoonData = {
  distance: number
  size: number
  speed: number
  phase: number
  color: string
}

export type RingData = {
  inner: number
  outer: number
  color: string
  opacity: number
  tilt: number
}

export type AtmosphereData = {
  color: string
  strength: number
}

export type PlanetData = {
  distance: number
  size: number
  speed: number
  phase: number
  color: string
  secondaryColor: string
  kind: 'rocky' | 'gas'
  moons: MoonData[]
  ring?: RingData
  atmosphere?: AtmosphereData
}

export type SpaceEnvironment = {
  nebulaCount: number
  nebulaPrimary: string
  nebulaSecondary: string
  nebulaDensity: number
  nebulaRotation: [number, number, number]
  galacticBandStrength: number
  galacticBandRotation: [number, number, number]
  starDensity: number
  dustDensity: number
  hazeColor: string
  hazeSecondary: string
  hazeStrength: number
  fogColor: string
  fogDensity: number
  ambientColor: string
  ambientIntensity: number
  gradeColor: string
  gradeStrength: number
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
}

export type SystemData = {
  seed: number
  starColor: string
  starSize: number
  planets: PlanetData[]
  environment: SpaceEnvironment
}

export type Controls = {
  moveX: number
  moveY: number
  lookDX: number
  lookDY: number
  boost: boolean
}

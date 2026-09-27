import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rng } from './generator'
import type { Controls, SpaceEnvironment } from './types'
import type { MutableRefObject } from 'react'

const skyVertex = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const deepFragment = `
uniform vec3 uHazeA;
uniform vec3 uHazeB;
uniform float uStrength;
uniform float uSeed;
varying vec3 vDir;

void main() {
  float upper = smoothstep(-0.85, 0.9, vDir.y);
  float waveA = 0.5 + 0.5 * sin(vDir.x * 3.0 + vDir.z * 2.1 + uSeed * 0.001);
  float waveB = 0.5 + 0.5 * sin(vDir.y * 4.2 - vDir.x * 1.8 + uSeed * 0.0017);
  float broad = smoothstep(0.18, 0.92, waveA * 0.66 + waveB * 0.34);
  vec3 blackBlue = vec3(0.002, 0.004, 0.012);
  vec3 haze = mix(uHazeA, uHazeB, upper * 0.55 + waveB * 0.3);
  float hazeMix = (0.055 + broad * 0.12) * uStrength;
  vec3 color = mix(blackBlue, haze, hazeMix);
  gl_FragColor = vec4(color, 1.0);
}
`

const nebulaFragment = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uDensity;
uniform float uSeed;
uniform float uOpacity;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(.1, .17, .13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = p * 2.03 + vec3(1.7, 2.3, 0.9);
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec3 p = vDir * 2.28 + vec3(uSeed * 0.013, uSeed * 0.021, uSeed * 0.008);
  float broad = fbm(p);
  float wisps = fbm(p * 2.35 + vec3(4.1, -2.4, 1.3));
  float filaments = fbm(p * 5.2 + vec3(-1.0, 3.2, 2.1));
  float field = broad * 0.7 + wisps * 0.23 + filaments * 0.07;
  float threshold = mix(0.69, 0.43, uDensity);
  float cloud = smoothstep(threshold, threshold + 0.2, field);
  float breakup = smoothstep(0.16, 0.8, wisps);
  float alpha = cloud * (0.56 + breakup * 0.44) * uOpacity;
  vec3 color = mix(uColorA, uColorB, smoothstep(0.2, 0.82, wisps));
  color *= 0.55 + cloud * 0.95;
  gl_FragColor = vec4(color, alpha);
}
`

const hazeFragment = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uStrength;
uniform float uSeed;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float a = 0.5 + 0.5 * sin(d.x * 4.4 + d.z * 2.7 + uSeed * 0.0011);
  float b = 0.5 + 0.5 * sin(d.y * 3.1 - d.x * 2.2 + uSeed * 0.0019);
  float c = 0.5 + 0.5 * sin((d.x + d.y + d.z) * 5.7 - uSeed * 0.0007);
  float mass = smoothstep(0.24, 0.86, a * 0.5 + b * 0.32 + c * 0.18);
  float veil = 0.035 + mass * 0.11;
  vec3 color = mix(uColorA, uColorB, b);
  gl_FragColor = vec4(color, veil * uStrength);
}
`

function makeSphericalPoints(seed: number, count: number, minRadius: number, maxRadius: number) {
  const r = rng(seed)
  const data = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const radius = minRadius + r() * (maxRadius - minRadius)
    const theta = r() * Math.PI * 2
    const phi = Math.acos(2 * r() - 1)
    data[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    data[i * 3 + 1] = radius * Math.cos(phi)
    data[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }
  return data
}

function StarLayer({ seed, count, size, color, opacity }: { seed: number; count: number; size: number; color: string; opacity: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(makeSphericalPoints(seed, count, 135, 286), 3))
    return g
  }, [seed, count])

  useEffect(() => () => geometry.dispose(), [geometry])

  return <points geometry={geometry} renderOrder={0}>
    <pointsMaterial
      color={color}
      size={size}
      sizeAttenuation
      transparent
      opacity={opacity}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </points>
}

function GalacticBand({ seed, strength, rotation, color }: { seed: number; strength: number; rotation: [number, number, number]; color: string }) {
  const geometry = useMemo(() => {
    const r = rng(seed ^ 0x17a2f13)
    const count = Math.round(3200 * Math.max(0.15, strength))
    const data = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 170 + r() * 95
      const lon = r() * Math.PI * 2
      const lat = (r() + r() + r() + r() - 2) * 0.14
      data[i * 3] = Math.cos(lat) * Math.cos(lon) * radius
      data[i * 3 + 1] = Math.sin(lat) * radius
      data[i * 3 + 2] = Math.cos(lat) * Math.sin(lon) * radius
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data, 3))
    return g
  }, [seed, strength])

  useEffect(() => () => geometry.dispose(), [geometry])
  if (strength <= 0) return null

  return <group rotation={rotation}>
    <points geometry={geometry} renderOrder={-5}>
      <pointsMaterial
        color={color}
        size={0.3}
        sizeAttenuation
        transparent
        opacity={Math.min(0.44, strength)}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  </group>
}

function Nebula({ seed, environment, index }: { seed: number; environment: SpaceEnvironment; index: number }) {
  const uniforms = useMemo(() => ({
    uColorA: { value: new THREE.Color(index === 0 ? environment.nebulaPrimary : environment.nebulaSecondary) },
    uColorB: { value: new THREE.Color(index === 0 ? environment.nebulaSecondary : environment.nebulaPrimary) },
    uDensity: { value: environment.nebulaDensity * (index === 0 ? 1 : 0.9) },
    uSeed: { value: seed + index * 971 },
    uOpacity: { value: index === 0 ? 0.72 : 0.5 },
  }), [seed, environment, index])

  const rotation: [number, number, number] = index === 0
    ? environment.nebulaRotation
    : [environment.nebulaRotation[1] + 1.2, environment.nebulaRotation[2] - 0.8, environment.nebulaRotation[0] + 0.5]

  return <mesh rotation={rotation} renderOrder={-20}>
    <sphereGeometry args={[244 - index * 8, 48, 32]} />
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={skyVertex}
      fragmentShader={nebulaFragment}
      side={THREE.BackSide}
      transparent
      depthWrite={false}
      depthTest={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </mesh>
}

function HazeShell({ seed, environment }: { seed: number; environment: SpaceEnvironment }) {
  const uniforms = useMemo(() => ({
    uColorA: { value: new THREE.Color(environment.hazeColor) },
    uColorB: { value: new THREE.Color(environment.hazeSecondary) },
    uStrength: { value: environment.hazeStrength },
    uSeed: { value: seed },
  }), [seed, environment])

  return <mesh rotation={[environment.nebulaRotation[2], environment.nebulaRotation[0], environment.nebulaRotation[1]]} renderOrder={-30}>
    <sphereGeometry args={[267, 36, 24]} />
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={skyVertex}
      fragmentShader={hazeFragment}
      side={THREE.BackSide}
      transparent
      depthWrite={false}
      depthTest={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </mesh>
}

export function CosmicBackdrop({ seed, environment }: { seed: number; environment: SpaceEnvironment }) {
  const ref = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const density = THREE.MathUtils.clamp(environment.starDensity, 0.5, 1.45)
  const deepUniforms = useMemo(() => ({
    uHazeA: { value: new THREE.Color(environment.hazeColor) },
    uHazeB: { value: new THREE.Color(environment.hazeSecondary) },
    uStrength: { value: environment.hazeStrength },
    uSeed: { value: seed },
  }), [seed, environment])

  useFrame(() => {
    if (ref.current) ref.current.position.copy(camera.position)
  })

  return <group ref={ref}>
    <mesh renderOrder={-100}>
      <sphereGeometry args={[300, 40, 28]} />
      <shaderMaterial
        uniforms={deepUniforms}
        vertexShader={skyVertex}
        fragmentShader={deepFragment}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>

    <HazeShell seed={seed} environment={environment} />

    {Array.from({ length: environment.nebulaCount }, (_, i) =>
      <Nebula key={i} seed={seed} environment={environment} index={i} />
    )}

    <GalacticBand
      seed={seed}
      strength={environment.galacticBandStrength}
      rotation={environment.galacticBandRotation}
      color={environment.hazeSecondary}
    />

    <StarLayer seed={seed ^ 0x127a} count={Math.round(1600 * density)} size={0.18} color="#cfe4ff" opacity={0.5} />
    <StarLayer seed={seed ^ 0x61c3} count={Math.round(680 * density)} size={0.38} color="#ffecc8" opacity={0.78} />
    <StarLayer seed={seed ^ 0xa419} count={Math.round(135 * density)} size={0.76} color="#edf7ff" opacity={0.96} />
  </group>
}

export function SpeedDust({ seed, density, controls }: { seed: number; density: number; controls: MutableRefObject<Controls> }) {
  const { camera } = useThree()
  const geometry = useMemo(() => {
    const r = rng(seed ^ 0x77be12)
    const count = Math.max(36, Math.round(68 * density))
    const positions = new Float32Array(count * 6)
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 34
      const y = (r() - 0.5) * 24
      const z = (r() - 0.5) * 34
      const j = i * 6
      positions[j] = positions[j + 3] = x
      positions[j + 1] = positions[j + 4] = y
      positions[j + 2] = positions[j + 5] = z
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [seed, density])

  const previous = useRef(new THREE.Vector3())
  const initialized = useRef(false)
  const material = useRef<THREE.LineBasicMaterial>(null)

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    if (!initialized.current) {
      previous.current.copy(camera.position)
      for (let i = 0; i < arr.length; i += 6) {
        arr[i] += camera.position.x
        arr[i + 1] += camera.position.y
        arr[i + 2] += camera.position.z
        arr[i + 3] = arr[i]
        arr[i + 4] = arr[i + 1]
        arr[i + 5] = arr[i + 2]
      }
      initialized.current = true
    }

    const velocity = camera.position.clone().sub(previous.current)
    previous.current.copy(camera.position)
    const speed = velocity.length()
    const trail = velocity.clone().multiplyScalar(-Math.min(13, 3 + speed * 25))
    const r = rng((seed + Math.floor(camera.position.x * 11) + Math.floor(camera.position.z * 17)) | 0)

    for (let i = 0; i < arr.length; i += 6) {
      let x = arr[i], y = arr[i + 1], z = arr[i + 2]
      if (Math.hypot(x - camera.position.x, y - camera.position.y, z - camera.position.z) > 27) {
        x = camera.position.x + (r() - 0.5) * 34
        y = camera.position.y + (r() - 0.5) * 24
        z = camera.position.z + (r() - 0.5) * 34
        arr[i] = x
        arr[i + 1] = y
        arr[i + 2] = z
      }
      arr[i + 3] = x + trail.x
      arr[i + 4] = y + trail.y
      arr[i + 5] = z + trail.z
    }
    attr.needsUpdate = true
    if (material.current) {
      material.current.opacity = controls.current.boost
        ? 0.46
        : THREE.MathUtils.clamp(speed * 0.72, 0.035, 0.19)
    }
  })

  return <lineSegments geometry={geometry}>
    <lineBasicMaterial
      ref={material}
      color="#dcecff"
      transparent
      opacity={0.04}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </lineSegments>
}

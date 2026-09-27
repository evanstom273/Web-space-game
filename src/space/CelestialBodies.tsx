import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { MoonData, PlanetData, SystemData } from './types'

const sunVertex = `
varying vec3 vPos;
varying vec3 vNormal;
void main() {
  vPos = position;
  vNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const sunFragment = `
uniform float uTime;
uniform vec3 uColor;
varying vec3 vPos;
varying vec3 vNormal;

void main() {
  float a = sin(vPos.x * 3.2 + uTime * 0.85);
  float b = sin(vPos.y * 4.7 - uTime * 0.62);
  float c = sin((vPos.z + vPos.x) * 5.1 + uTime * 0.44);
  float cells = (a + b + c) / 3.0;
  float fine = sin(vPos.x * 11.0 - uTime) * sin(vPos.y * 9.0 + uTime * 0.7) * 0.12;
  float edge = pow(1.0 - abs(normalize(vNormal).z), 1.6);
  float energy = 1.85 + cells * 0.22 + fine + edge * 0.18;
  gl_FragColor = vec4(uColor * energy, 1.0);
}
`

const atmosphereVertex = `
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const atmosphereFragment = `
uniform vec3 uColor;
uniform float uStrength;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(vWorldNormal, viewDir), 0.0), 3.2);
  float alpha = fresnel * uStrength;
  gl_FragColor = vec4(uColor * (0.55 + fresnel * 0.85), alpha);
}
`

function Orbit({ radius }: { radius: number }) {
  return <mesh rotation-x={Math.PI / 2}>
    <ringGeometry args={[radius - 0.014, radius + 0.014, 160]} />
    <meshBasicMaterial color="#9badc0" transparent opacity={0.095} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>
}

function Atmosphere({ planet }: { planet: PlanetData }) {
  if (!planet.atmosphere) return null
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(planet.atmosphere!.color) },
    uStrength: { value: planet.atmosphere!.strength },
  }), [planet.atmosphere])

  return <mesh scale={1.055} renderOrder={3}>
    <sphereGeometry args={[planet.size, 32, 24]} />
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={atmosphereVertex}
      fragmentShader={atmosphereFragment}
      side={THREE.FrontSide}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </mesh>
}

function PlanetRing({ planet }: { planet: PlanetData }) {
  if (!planet.ring) return null
  return <mesh rotation={[Math.PI / 2 + planet.ring.tilt, 0.12, planet.ring.tilt * 0.35]} renderOrder={1}>
    <ringGeometry args={[planet.ring.inner, planet.ring.outer, 128, 3]} />
    <meshStandardMaterial
      color={planet.ring.color}
      transparent
      opacity={planet.ring.opacity}
      roughness={0.92}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  </mesh>
}

function Moon({ data }: { data: MoonData }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const a = data.phase + clock.elapsedTime * data.speed
    if (ref.current) ref.current.position.set(
      Math.cos(a) * data.distance,
      Math.sin(a * 0.43) * 0.22,
      Math.sin(a) * data.distance,
    )
  })

  return <mesh ref={ref} castShadow receiveShadow>
    <sphereGeometry args={[data.size, 18, 14]} />
    <meshStandardMaterial color={data.color} roughness={0.96} metalness={0.02} />
  </mesh>
}

function Planet({ data }: { data: PlanetData }) {
  const group = useRef<THREE.Group>(null)
  const planet = useRef<THREE.Mesh>(null)

  useFrame(({ clock }, delta) => {
    const a = data.phase + clock.elapsedTime * data.speed
    if (group.current) group.current.position.set(Math.cos(a) * data.distance, 0, Math.sin(a) * data.distance)
    if (planet.current) planet.current.rotation.y += delta * (data.kind === 'gas' ? 0.08 : 0.035)
  })

  return <>
    <Orbit radius={data.distance} />
    <group ref={group}>
      <mesh ref={planet} castShadow receiveShadow>
        <sphereGeometry args={[data.size, data.kind === 'gas' ? 42 : 32, data.kind === 'gas' ? 28 : 22]} />
        <meshStandardMaterial
          color={data.color}
          roughness={data.kind === 'gas' ? 0.72 : 0.91}
          metalness={0.01}
          emissive={data.secondaryColor}
          emissiveIntensity={data.kind === 'gas' ? 0.018 : 0.008}
        />
      </mesh>
      <PlanetRing planet={data} />
      <Atmosphere planet={data} />
      {data.moons.map((moon, i) => <Moon key={i} data={moon} />)}
    </group>
  </>
}

function Sun({ system }: { system: SystemData }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const hdrColor = useMemo(() => new THREE.Color(system.starColor), [system.starColor])
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: hdrColor },
  }), [hdrColor])

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return <group>
    <mesh>
      <sphereGeometry args={[system.starSize, 56, 40]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={sunVertex}
        fragmentShader={sunFragment}
        toneMapped={false}
      />
    </mesh>
    <mesh renderOrder={2}>
      <sphereGeometry args={[system.starSize * 1.18, 32, 22]} />
      <meshBasicMaterial
        color={system.starColor}
        transparent
        opacity={0.16}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
    <mesh renderOrder={1}>
      <sphereGeometry args={[system.starSize * 1.48, 28, 18]} />
      <meshBasicMaterial
        color={system.starColor}
        transparent
        opacity={0.045}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  </group>
}

export function CelestialSystem({ system }: { system: SystemData }) {
  return <>
    <ambientLight intensity={0.018} />
    <pointLight
      position={[0, 0, 0]}
      intensity={1450}
      distance={240}
      decay={1.65}
      color={system.starColor}
    />
    <Sun system={system} />
    {system.planets.map((planet, i) => <Planet key={i} data={planet} />)}
  </>
}

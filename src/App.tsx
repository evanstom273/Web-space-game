import { Canvas } from '@react-three/fiber'
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CelestialSystem } from './space/CelestialBodies'
import { CosmicBackdrop, SpeedDust } from './space/CosmicBackdrop'
import { FlightController } from './space/FlightController'
import { makeSystem } from './space/generator'
import { PostProcessing } from './space/PostProcessing'
import type { Controls, SystemData } from './space/types'

function Scene({ system, controls }: { system: SystemData; controls: React.MutableRefObject<Controls> }) {
  return <>
    <fog attach="fog" args={['#010207', 125, 340]} />
    <CosmicBackdrop seed={system.seed} environment={system.environment} />
    <CelestialSystem system={system} />
    <SpeedDust seed={system.seed} controls={controls} />
    <FlightController controls={controls} />
    <PostProcessing />
  </>
}

function MobileControls({ controls }: { controls: React.MutableRefObject<Controls> }) {
  const stick = useRef<HTMLDivElement>(null)
  const nub = useRef<HTMLDivElement>(null)
  const stickPointer = useRef<number | null>(null)
  const lookPointer = useRef<number | null>(null)
  const lastLook = useRef({ x: 0, y: 0 })

  const resetStick = () => {
    controls.current.moveX = 0
    controls.current.moveY = 0
    if (nub.current) nub.current.style.transform = 'translate(-50%, -50%)'
  }

  const stickDown = (e: ReactPointerEvent) => {
    stickPointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const stickMove = (e: ReactPointerEvent) => {
    if (stickPointer.current !== e.pointerId || !stick.current) return
    const rect = stick.current.getBoundingClientRect()
    let dx = e.clientX - (rect.left + rect.width / 2)
    let dy = e.clientY - (rect.top + rect.height / 2)
    const max = rect.width * 0.32
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx *= max / len
      dy *= max / len
    }
    controls.current.moveX = dx / max
    controls.current.moveY = -dy / max
    if (nub.current) {
      nub.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    }
  }

  const lookDown = (e: ReactPointerEvent) => {
    lookPointer.current = e.pointerId
    lastLook.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const lookMove = (e: ReactPointerEvent) => {
    if (lookPointer.current !== e.pointerId) return
    controls.current.lookDX += e.clientX - lastLook.current.x
    controls.current.lookDY += e.clientY - lastLook.current.y
    lastLook.current = { x: e.clientX, y: e.clientY }
  }

  return <div className="mobile-controls">
    <div
      className="joystick"
      ref={stick}
      onPointerDown={stickDown}
      onPointerMove={stickMove}
      onPointerUp={() => { stickPointer.current = null; resetStick() }}
      onPointerCancel={() => { stickPointer.current = null; resetStick() }}
    >
      <div className="joystick-nub" ref={nub} />
    </div>

    <div
      className="look-zone"
      aria-label="Drag to look around"
      onPointerDown={lookDown}
      onPointerMove={lookMove}
      onPointerUp={() => { lookPointer.current = null }}
      onPointerCancel={() => { lookPointer.current = null }}
    >
      <span>DRAG TO LOOK</span>
    </div>

    <button
      className="boost"
      onPointerDown={() => { controls.current.boost = true }}
      onPointerUp={() => { controls.current.boost = false }}
      onPointerLeave={() => { controls.current.boost = false }}
      onPointerCancel={() => { controls.current.boost = false }}
    >
      BOOST
    </button>
  </div>
}

export default function App() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000))
  const system = useMemo(() => makeSystem(seed), [seed])
  const controls = useRef<Controls>({ moveX: 0, moveY: 0, lookDX: 0, lookDY: 0, boost: false })

  const regenerate = () => {
    controls.current = { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0, boost: false }
    setSeed(Math.floor(Math.random() * 1_000_000_000))
  }

  return <main className="game-shell">
    <Canvas
      dpr={[1, 1.4]}
      camera={{ fov: 65, near: 0.05, far: 650 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Scene key={seed} system={system} controls={controls} />
    </Canvas>

    <div className="top-hud">
      <div>
        <strong>SYS-{String(seed).padStart(9, '0')}</strong>
        <span>
          {system.planets.length} PLANETS · {system.environment.nebulaCount === 0 ? 'DEEP SPACE' : `${system.environment.nebulaCount} NEBULA${system.environment.nebulaCount > 1 ? 'E' : ''}`}
        </span>
      </div>
      <button onClick={regenerate}>↻ NEW SYSTEM</button>
    </div>

    <div className="reticle" aria-hidden="true">+</div>
    <div className="desktop-help">WASD fly · mouse look · Shift/Space vertical · Ctrl boost</div>
    <MobileControls controls={controls} />
  </main>
}

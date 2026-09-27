import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { Controls } from './types'

export function FlightController({ controls }: { controls: MutableRefObject<Controls> }) {
  const { camera, gl } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(-0.08)
  const keys = useRef(new Set<string>())

  useEffect(() => {
    camera.position.set(0, 7, 30)
    yaw.current = 0
    pitch.current = -0.08

    const down = (e: KeyboardEvent) => keys.current.add(e.code)
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [camera])

  useFrame((_, delta) => {
    const c = controls.current
    yaw.current -= c.lookDX * 0.003
    pitch.current = THREE.MathUtils.clamp(pitch.current - c.lookDY * 0.003, -1.45, 1.45)
    c.lookDX = 0
    c.lookDY = 0

    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current

    let x = c.moveX
    let z = -c.moveY
    if (keys.current.has('KeyA')) x -= 1
    if (keys.current.has('KeyD')) x += 1
    if (keys.current.has('KeyW')) z -= 1
    if (keys.current.has('KeyS')) z += 1

    const vertical = (keys.current.has('Space') ? 1 : 0) - (keys.current.has('ShiftLeft') ? 1 : 0)
    const speed = (c.boost || keys.current.has('ControlLeft') ? 26 : 11) * delta
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)

    camera.position.addScaledVector(forward, -z * speed)
    camera.position.addScaledVector(right, x * speed)
    camera.position.y += vertical * speed
  })

  useEffect(() => {
    const canvas = gl.domElement
    const click = () => {
      if (window.matchMedia('(pointer:fine)').matches) canvas.requestPointerLock?.()
    }
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        controls.current.lookDX += e.movementX
        controls.current.lookDY += e.movementY
      }
    }
    canvas.addEventListener('click', click)
    document.addEventListener('mousemove', move)
    return () => {
      canvas.removeEventListener('click', click)
      document.removeEventListener('mousemove', move)
    }
  }, [gl, controls])

  return null
}

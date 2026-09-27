import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { SpaceEnvironment } from './types'

const gradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTint: { value: new THREE.Color('#ffffff') },
    uStrength: { value: 0.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 uTint;
    uniform float uStrength;
    varying vec2 vUv;

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      float luma = dot(base.rgb, vec3(0.2126, 0.7152, 0.0722));

      vec3 tintTarget = base.rgb * mix(vec3(1.0), uTint * 1.34, uStrength);
      tintTarget += uTint * (0.018 + luma * 0.022) * uStrength;

      float sat = 1.08;
      float gray = dot(tintTarget, vec3(0.299, 0.587, 0.114));
      vec3 graded = mix(vec3(gray), tintTarget, sat);

      vec2 centered = vUv - 0.5;
      float edge = smoothstep(0.34, 0.78, dot(centered, centered) * 1.7);
      graded *= 1.0 - edge * 0.12;

      gl_FragColor = vec4(graded, base.a);
    }
  `,
}

export function PostProcessing({ environment }: { environment: SpaceEnvironment }) {
  const { gl, scene, camera, size } = useThree()

  const composer = useMemo(() => {
    const next = new EffectComposer(gl)
    next.addPass(new RenderPass(scene, camera))

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      environment.bloomStrength,
      environment.bloomRadius,
      environment.bloomThreshold,
    )
    next.addPass(bloom)

    const grade = new ShaderPass(gradeShader)
    grade.uniforms.uTint.value = new THREE.Color(environment.gradeColor)
    grade.uniforms.uStrength.value = environment.gradeStrength
    next.addPass(grade)

    next.addPass(new OutputPass())
    return next
  }, [gl, scene, camera, environment])

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.08
    gl.outputColorSpace = THREE.SRGBColorSpace
  }, [gl])

  useEffect(() => {
    composer.setSize(size.width, size.height)
  }, [composer, size.width, size.height])

  useEffect(() => () => composer.dispose(), [composer])

  useFrame(() => composer.render(), 1)
  return null
}

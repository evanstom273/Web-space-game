import { Canvas } from '@react-three/fiber'

function TestScene() {
  return <>
    <ambientLight intensity={0.45} />
    <directionalLight position={[4, 6, 3]} intensity={2} />
    <mesh rotation={[0.35, 0.5, 0]}>
      <icosahedronGeometry args={[1.4, 2]} />
      <meshStandardMaterial color="#70d7ff" roughness={0.65} />
    </mesh>
  </>
}

export default function App() {
  return <main className="game-shell">
    <Canvas camera={{ position: [0, 0, 5], fov: 55 }}>
      <TestScene />
    </Canvas>
    <section className="hud">
      <p className="eyebrow">PROTOTYPE // ONLINE</p>
      <h1>Web Space Game</h1>
      <p>Vite + React + TypeScript + WebGL</p>
    </section>
  </main>
}

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'

type MoonData={distance:number;size:number;speed:number;phase:number;color:string}
type PlanetData={distance:number;size:number;speed:number;phase:number;color:string;moons:MoonData[]}
type SystemData={seed:number;starColor:string;starSize:number;planets:PlanetData[]}
type Controls={moveX:number;moveY:number;lookDX:number;lookDY:number;boost:boolean}

function rng(seed:number){let t=seed>>>0;return()=>{t+=0x6d2b79f5;let r=Math.imul(t^(t>>>15),1|t);r^=r+Math.imul(r^(r>>>7),61|r);return((r^(r>>>14))>>>0)/4294967296}}

function makeSystem(seed:number):SystemData{
 const r=rng(seed),palette=['#69b7ff','#e79a62','#8ad39d','#c38ce8','#d7c47a','#ec7777','#8bd8d3'],stars=['#fff1c4','#ffd39b','#d7e7ff','#ffe6aa']
 const count=4+Math.floor(r()*5),planets:PlanetData[]=[];let distance=8
 for(let i=0;i<count;i++){distance+=4+r()*5;const size=.65+r()*1.55
  const moons=Array.from({length:r()>.45?Math.floor(r()*3)+1:0},(_,m)=>({distance:size+1.1+m*.8+r()*.5,size:.16+r()*.32,speed:.25+r()*.55,phase:r()*Math.PI*2,color:'#aab3bd'}))
  planets.push({distance,size,speed:.025+r()*.055,phase:r()*Math.PI*2,color:palette[Math.floor(r()*palette.length)],moons})
 }
 return{seed,starColor:stars[Math.floor(r()*stars.length)],starSize:2.8+r()*1.7,planets}
}

function Orbit({radius}:{radius:number}){return <mesh rotation-x={Math.PI/2}><ringGeometry args={[radius-.018,radius+.018,128]}/><meshBasicMaterial color="#8aa0b8" transparent opacity={.16} side={THREE.DoubleSide}/></mesh>}

function Moon({data}:{data:MoonData}){
 const ref=useRef<THREE.Mesh>(null)
 useFrame(({clock})=>{const a=data.phase+clock.elapsedTime*data.speed;if(ref.current)ref.current.position.set(Math.cos(a)*data.distance,Math.sin(a*.35)*.2,Math.sin(a)*data.distance)})
 return <mesh ref={ref}><sphereGeometry args={[data.size,16,12]}/><meshStandardMaterial color={data.color} roughness={1}/></mesh>
}

function Planet({data}:{data:PlanetData}){
 const group=useRef<THREE.Group>(null),planet=useRef<THREE.Mesh>(null)
 useFrame(({clock})=>{const a=data.phase+clock.elapsedTime*data.speed;if(group.current)group.current.position.set(Math.cos(a)*data.distance,0,Math.sin(a)*data.distance);if(planet.current)planet.current.rotation.y+=.002})
 return <><Orbit radius={data.distance}/><group ref={group}><mesh ref={planet}><sphereGeometry args={[data.size,28,20]}/><meshStandardMaterial color={data.color} roughness={.78}/></mesh>{data.moons.map((m,i)=><Moon key={i} data={m}/>)}</group></>
}

function Starfield({seed}:{seed:number}){
 const geometry=useMemo(()=>{const r=rng(seed^0x51f15e),p=new Float32Array(2400*3);for(let i=0;i<2400;i++){const radius=110+r()*180,theta=r()*Math.PI*2,phi=Math.acos(2*r()-1);p[i*3]=radius*Math.sin(phi)*Math.cos(theta);p[i*3+1]=radius*Math.cos(phi);p[i*3+2]=radius*Math.sin(phi)*Math.sin(theta)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));return g},[seed])
 useEffect(()=>()=>geometry.dispose(),[geometry])
 return <points geometry={geometry}><pointsMaterial color="white" size={.34} sizeAttenuation transparent opacity={.85}/></points>
}

function FlightController({controls}:{controls:MutableRefObject<Controls>}){
 const{camera,gl}=useThree(),yaw=useRef(0),pitch=useRef(-.08),keys=useRef(new Set<string>())
 useEffect(()=>{camera.position.set(0,7,30);const d=(e:KeyboardEvent)=>keys.current.add(e.code),u=(e:KeyboardEvent)=>keys.current.delete(e.code);window.addEventListener('keydown',d);window.addEventListener('keyup',u);return()=>{window.removeEventListener('keydown',d);window.removeEventListener('keyup',u)}},[camera])
 useFrame((_,delta)=>{const c=controls.current;yaw.current-=c.lookDX*.003;pitch.current=THREE.MathUtils.clamp(pitch.current-c.lookDY*.003,-1.45,1.45);c.lookDX=0;c.lookDY=0;camera.rotation.order='YXZ';camera.rotation.y=yaw.current;camera.rotation.x=pitch.current
  let x=c.moveX,z=-c.moveY;if(keys.current.has('KeyA'))x-=1;if(keys.current.has('KeyD'))x+=1;if(keys.current.has('KeyW'))z-=1;if(keys.current.has('KeyS'))z+=1
  const vertical=(keys.current.has('Space')?1:0)-(keys.current.has('ShiftLeft')?1:0),speed=(c.boost||keys.current.has('ControlLeft')?24:11)*delta
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion)
  camera.position.addScaledVector(forward,-z*speed);camera.position.addScaledVector(right,x*speed);camera.position.y+=vertical*speed
 })
 useEffect(()=>{const canvas=gl.domElement,click=()=>{if(window.matchMedia('(pointer:fine)').matches)canvas.requestPointerLock?.()},move=(e:MouseEvent)=>{if(document.pointerLockElement===canvas){controls.current.lookDX+=e.movementX;controls.current.lookDY+=e.movementY}};canvas.addEventListener('click',click);document.addEventListener('mousemove',move);return()=>{canvas.removeEventListener('click',click);document.removeEventListener('mousemove',move)}},[gl,controls])
 return null
}

function SolarSystem({system,controls}:{system:SystemData;controls:MutableRefObject<Controls>}){
 return <><color attach="background" args={['#010207']}/><fog attach="fog" args={['#010207',90,260]}/><Starfield seed={system.seed}/><ambientLight intensity={.11}/><pointLight position={[0,0,0]} intensity={850} distance={180} decay={1.7} color={system.starColor}/><mesh><sphereGeometry args={[system.starSize,40,28]}/><meshBasicMaterial color={system.starColor}/></mesh>{system.planets.map((p,i)=><Planet key={i} data={p}/>)}<FlightController controls={controls}/></>
}

function MobileControls({controls}:{controls:MutableRefObject<Controls>}){
 const stick=useRef<HTMLDivElement>(null),nub=useRef<HTMLDivElement>(null),stickPointer=useRef<number|null>(null),lookPointer=useRef<number|null>(null),lastLook=useRef({x:0,y:0})
 const reset=()=>{controls.current.moveX=0;controls.current.moveY=0;if(nub.current)nub.current.style.transform='translate(-50%, -50%)'}
 const stickDown=(e:ReactPointerEvent)=>{stickPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId)}
 const stickMove=(e:ReactPointerEvent)=>{if(stickPointer.current!==e.pointerId||!stick.current)return;const rect=stick.current.getBoundingClientRect();let dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2),max=rect.width*.32,len=Math.hypot(dx,dy);if(len>max){dx*=max/len;dy*=max/len}controls.current.moveX=dx/max;controls.current.moveY=-dy/max;if(nub.current)nub.current.style.transform='translate(calc(-50% + '+dx+'px), calc(-50% + '+dy+'px))'}
 const lookDown=(e:ReactPointerEvent)=>{lookPointer.current=e.pointerId;lastLook.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}
 const lookMove=(e:ReactPointerEvent)=>{if(lookPointer.current!==e.pointerId)return;controls.current.lookDX+=e.clientX-lastLook.current.x;controls.current.lookDY+=e.clientY-lastLook.current.y;lastLook.current={x:e.clientX,y:e.clientY}}
 return <div className="mobile-controls"><div className="joystick" ref={stick} onPointerDown={stickDown} onPointerMove={stickMove} onPointerUp={()=>{stickPointer.current=null;reset()}} onPointerCancel={()=>{stickPointer.current=null;reset()}}><div className="joystick-nub" ref={nub}/></div><div className="look-zone" onPointerDown={lookDown} onPointerMove={lookMove} onPointerUp={()=>lookPointer.current=null} onPointerCancel={()=>lookPointer.current=null}><span>DRAG TO LOOK</span></div><button className="boost" onPointerDown={()=>controls.current.boost=true} onPointerUp={()=>controls.current.boost=false} onPointerCancel={()=>controls.current.boost=false}>BOOST</button></div>
}

export default function App(){
 const[seed,setSeed]=useState(()=>Math.floor(Math.random()*1_000_000_000)),system=useMemo(()=>makeSystem(seed),[seed]),controls=useRef<Controls>({moveX:0,moveY:0,lookDX:0,lookDY:0,boost:false})
 return <main className="game-shell"><Canvas camera={{fov:65,near:.05,far:500}}><SolarSystem system={system} controls={controls}/></Canvas><div className="top-hud"><div><strong>SYS-{String(seed).padStart(9,'0')}</strong><span>{system.planets.length} PLANETS</span></div><button onClick={()=>setSeed(Math.floor(Math.random()*1_000_000_000))}>↻ NEW SYSTEM</button></div><div className="reticle">+</div><div className="desktop-help">WASD fly · mouse look · Shift/Space vertical · Ctrl boost</div><MobileControls controls={controls}/></main>
}

"use client"

import { useRef, useState, useEffect, Suspense, useMemo, useCallback } from "react"
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Html, Center } from "@react-three/drei"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { useTheme } from "next-themes"
import * as THREE from "three"

interface Entity {
  id: string
  name: string
  type: "player" | "item" | "objective"
  position: [number, number, number]
  health?: number
  team?: string
  description?: string
}

interface MapMeta {
  id: string
  name: string
  source: string
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
    minZ: number
    maxZ: number
  }
}

interface ViewportProps {
  selectedMap: string
  selectedEntity: Entity | null
  onSelectEntity: (entity: Entity | null) => void
  cameraResetTrigger: number
}

// Mock entities for demonstration
const mockEntities: Entity[] = [
  { id: "1", name: "Player_Alpha", type: "player", position: [2, 0.5, 1], health: 100, team: "CT", description: "Counter-Terrorist operative" },
  { id: "2", name: "Player_Bravo", type: "player", position: [-1.5, 0.5, 2], health: 75, team: "T", description: "Terrorist operative" },
  { id: "3", name: "Bomb_Site_A", type: "objective", position: [3, 0.3, -2], description: "Primary bomb plant location" },
  { id: "4", name: "AWP_Pickup", type: "item", position: [-2, 0.3, -1], description: "Sniper rifle spawn point" },
  { id: "5", name: "Player_Charlie", type: "player", position: [0, 0.5, -3], health: 50, team: "CT", description: "Counter-Terrorist support" },
]

function EntityMarker({ 
  entity, 
  isSelected, 
  onClick 
}: { 
  entity: Entity
  isSelected: boolean
  onClick: () => void 
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = entity.type === "player" 
    ? (entity.team === "CT" ? "#3b82f6" : "#ef4444")
    : entity.type === "objective" 
    ? "#eab308" 
    : "#22c55e"

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = entity.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={entity.position}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = "auto"
      }}
    >
      <sphereGeometry args={[isSelected ? 0.18 : 0.15, 16, 16]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={hovered || isSelected ? 0.5 : 0.2}
        transparent
        opacity={hovered || isSelected ? 1 : 0.8}
      />
      {(hovered || isSelected) && (
        <Html
          position={[0, 0.4, 0]}
          center
          style={{
            pointerEvents: "none",
          }}
        >
          <div className="bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded border border-border whitespace-nowrap">
            {entity.name}
          </div>
        </Html>
      )}
    </mesh>
  )
}

function MapGrid({ isDark }: { isDark: boolean }) {
  const gridColor = isDark ? "#333333" : "#cccccc"
  const gridSubColor = isDark ? "#262626" : "#e5e5e5"
  
  return (
    <gridHelper 
      args={[100, 100, gridColor, gridSubColor]} 
      position={[0, 0.01, 0]}
    />
  )
}

interface MapLayers {
  terrain: THREE.Group
  barriers: THREE.Group
}

function isBarrierNodeName(name: string) {
  return name.trim().toLowerCase() === "barriers"
}

function hasBarrierAncestor(node: THREE.Object3D) {
  let current = node.parent

  while (current) {
    if (isBarrierNodeName(current.name)) {
      return true
    }
    current = current.parent
  }

  return false
}

function applyMaterialToLayer(root: THREE.Object3D, material: THREE.MeshStandardMaterial) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = material.clone()
      child.castShadow = true
      child.receiveShadow = true
    }
  })
}

function splitMapLayers(obj: THREE.Group, terrainColor: string): MapLayers {
  const terrain = obj.clone(true)
  const barriers = new THREE.Group()
  barriers.name = "barriers"

  terrain.updateMatrixWorld(true)

  const barrierNodes: THREE.Object3D[] = []
  terrain.traverse((child) => {
    if (isBarrierNodeName(child.name) && !hasBarrierAncestor(child)) {
      barrierNodes.push(child)
    }
  })

  for (const barrierNode of barrierNodes) {
    const extractedBarrier = barrierNode.clone(true)
    const worldPosition = new THREE.Vector3()
    const worldQuaternion = new THREE.Quaternion()
    const worldScale = new THREE.Vector3()

    barrierNode.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale)
    extractedBarrier.position.copy(worldPosition)
    extractedBarrier.quaternion.copy(worldQuaternion)
    extractedBarrier.scale.copy(worldScale)
    barriers.add(extractedBarrier)

    barrierNode.parent?.remove(barrierNode)
  }

  applyMaterialToLayer(
    terrain,
    new THREE.MeshStandardMaterial({
      color: terrainColor,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }),
  )

  applyMaterialToLayer(
    barriers,
    new THREE.MeshStandardMaterial({
      color: "#38bdf8",
      roughness: 0.4,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  )

  return { terrain, barriers }
}

function MapModel({
  mapId,
  isDark,
  showBarriers = false,
  onBoundsCalculated,
}: {
  mapId: string
  isDark: boolean
  showBarriers?: boolean
  onBoundsCalculated?: (center: THREE.Vector3, size: THREE.Vector3) => void
}) {
  const objPath = `/maps/${mapId}/${mapId}.obj`
  const obj = useLoader(OBJLoader, objPath)
  
  const modelColor = isDark ? "#1a1a1a" : "#e5e5e5"
  
  const layers = useMemo(() => {
    return splitMapLayers(obj, modelColor)
  }, [obj, modelColor])

  // Calculate bounds and notify parent
  useEffect(() => {
    if (layers.terrain && onBoundsCalculated) {
      const box = new THREE.Box3().setFromObject(layers.terrain)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      onBoundsCalculated(center, size)
    }
  }, [layers, onBoundsCalculated])

  return (
    <>
      <primitive object={layers.terrain} />
      {showBarriers ? <primitive object={layers.barriers} /> : null}
    </>
  )
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="text-muted-foreground text-sm">Loading map...</div>
    </Html>
  )
}

function CameraController({ 
  resetTrigger, 
  mapCenter, 
  mapSize 
}: { 
  resetTrigger: number
  mapCenter: THREE.Vector3 | null
  mapSize: THREE.Vector3 | null
}) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const hasInitialized = useRef(false)

  // Set camera position based on map bounds
  useEffect(() => {
    if (mapCenter && mapSize && !hasInitialized.current) {
      const maxDim = Math.max(mapSize.x, mapSize.y, mapSize.z)
      const distance = maxDim * 1.2
      
      camera.position.set(
        mapCenter.x + distance * 0.7,
        mapCenter.y + distance * 0.5,
        mapCenter.z + distance * 0.7
      )
      camera.lookAt(mapCenter)
      
      if (controlsRef.current) {
        controlsRef.current.target.copy(mapCenter)
        controlsRef.current.update()
      }
      hasInitialized.current = true
    }
  }, [mapCenter, mapSize, camera])

  // Reset camera on trigger
  useEffect(() => {
    if (resetTrigger > 0 && mapCenter && mapSize) {
      const maxDim = Math.max(mapSize.x, mapSize.y, mapSize.z)
      const distance = maxDim * 1.2
      
      camera.position.set(
        mapCenter.x + distance * 0.7,
        mapCenter.y + distance * 0.5,
        mapCenter.z + distance * 0.7
      )
      camera.lookAt(mapCenter)
      
      if (controlsRef.current) {
        controlsRef.current.target.copy(mapCenter)
        controlsRef.current.update()
      }
    }
  }, [resetTrigger, mapCenter, mapSize, camera])

  // Reset initialization flag when map changes
  useEffect(() => {
    hasInitialized.current = false
  }, [mapCenter])

  const maxDistance = mapSize ? Math.max(mapSize.x, mapSize.y, mapSize.z) * 3 : 1000

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={1}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2 - 0.01}
    />
  )
}

function Scene({ 
  selectedMap,
  selectedEntity, 
  onSelectEntity,
  cameraResetTrigger,
  isDark
}: ViewportProps & { isDark: boolean }) {
  const [mapCenter, setMapCenter] = useState<THREE.Vector3 | null>(null)
  const [mapSize, setMapSize] = useState<THREE.Vector3 | null>(null)

  const handleBoundsCalculated = useCallback((center: THREE.Vector3, size: THREE.Vector3) => {
    setMapCenter(center)
    setMapSize(size)
  }, [])

  // Reset bounds when map changes
  useEffect(() => {
    setMapCenter(null)
    setMapSize(null)
  }, [selectedMap])

  return (
    <>
      <PerspectiveCamera makeDefault position={[200, 150, 200]} fov={50} />
      <CameraController 
        resetTrigger={cameraResetTrigger} 
        mapCenter={mapCenter}
        mapSize={mapSize}
      />
      
      <ambientLight intensity={isDark ? 0.4 : 0.6} />
      <directionalLight position={[100, 200, 100]} intensity={isDark ? 0.6 : 0.8} castShadow />
      <pointLight position={[-100, 100, -100]} intensity={isDark ? 0.3 : 0.4} />
      
      <Suspense fallback={<LoadingFallback />}>
        <MapModel 
          mapId={selectedMap} 
          isDark={isDark} 
          onBoundsCalculated={handleBoundsCalculated}
        />
      </Suspense>
      
      {mockEntities.map((entity) => (
        <EntityMarker
          key={entity.id}
          entity={entity}
          isSelected={selectedEntity?.id === entity.id}
          onClick={() => onSelectEntity(
            selectedEntity?.id === entity.id ? null : entity
          )}
        />
      ))}
    </>
  )
}

export function Viewport({ selectedMap, selectedEntity, onSelectEntity, cameraResetTrigger }: ViewportProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isDark = mounted ? resolvedTheme === "dark" : true
  const bgColor = isDark ? "#0d0d0d" : "#f5f5f5"

  return (
    <div className="absolute inset-0 bg-background">
      <Canvas
        shadows
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%", background: bgColor }}
        onPointerMissed={() => onSelectEntity(null)}
      >
        <Suspense fallback={null}>
          <Scene 
            selectedMap={selectedMap}
            selectedEntity={selectedEntity}
            onSelectEntity={onSelectEntity}
            cameraResetTrigger={cameraResetTrigger}
            isDark={isDark}
          />
        </Suspense>
      </Canvas>
      
      {/* Coordinates overlay */}
      <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground font-mono bg-card/80 px-2 py-1 rounded border border-border">
        Pan: Right Click | Rotate: Left Click | Zoom: Scroll
      </div>
    </div>
  )
}

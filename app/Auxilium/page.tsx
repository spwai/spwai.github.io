"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/auxilium/header"
import { DetailsPanel } from "@/components/auxilium/details-panel"
import { Legend } from "@/components/auxilium/legend"

const Viewport = dynamic(
  () => import("@/components/auxilium/viewport").then(mod => ({ default: mod.Viewport })),
  { ssr: false }
)

interface Entity {
  id: string
  name: string
  type: "player" | "item" | "objective"
  position: [number, number, number]
  health?: number
  team?: string
  description?: string
}

export default function AuxiliumPage() {
  const [selectedMap, setSelectedMap] = useState("ancient")
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [cameraResetTrigger, setCameraResetTrigger] = useState(0)

  const handleMapChange = useCallback((map: string) => {
    setSelectedMap(map)
    setSelectedEntity(null)
  }, [])

  const handleResetCamera = useCallback(() => {
    setCameraResetTrigger(prev => prev + 1)
  }, [])

  const handleSelectEntity = useCallback((entity: Entity | null) => {
    setSelectedEntity(entity)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedEntity(null)
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <div className="h-screen flex flex-col bg-background">
        <Header 
          selectedMap={selectedMap}
          onMapChange={handleMapChange}
          onResetCamera={handleResetCamera}
        />
        <main className="flex-1 relative overflow-hidden">
          <Viewport 
            selectedMap={selectedMap}
            selectedEntity={selectedEntity}
            onSelectEntity={handleSelectEntity}
            cameraResetTrigger={cameraResetTrigger}
          />
          <DetailsPanel 
            entity={selectedEntity}
            onClose={handleCloseDetails}
          />
          <Legend />
        </main>
      </div>
    </ThemeProvider>
  )
}

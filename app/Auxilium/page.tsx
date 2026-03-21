"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/auxilium/header"
import { DetailsPanel } from "@/components/auxilium/details-panel"
import { Legend } from "@/components/auxilium/legend"
import {
  type Entity,
  type MapMeta,
  AUXCLOUD_POLL_INTERVAL_MS,
  fetchMapMeta,
  fetchMapSnapshot,
  toSceneEntities,
} from "@/lib/auxcloud"

const Viewport = dynamic(
  () => import("@/components/auxilium/viewport").then(mod => ({ default: mod.Viewport })),
  { ssr: false }
)

export default function AuxiliumPage() {
  const [selectedMap, setSelectedMap] = useState("ancient")
  const [selectedEntityID, setSelectedEntityID] = useState<string | null>(null)
  const [cameraResetTrigger, setCameraResetTrigger] = useState(0)
  const [mapMeta, setMapMeta] = useState<MapMeta | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])

  const handleMapChange = useCallback((map: string) => {
    setSelectedMap(map)
    setSelectedEntityID(null)
  }, [])

  const handleResetCamera = useCallback(() => {
    setCameraResetTrigger(prev => prev + 1)
  }, [])

  const handleSelectEntity = useCallback((entity: Entity | null) => {
    setSelectedEntityID(entity?.id ?? null)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedEntityID(null)
  }, [])

  useEffect(() => {
    let active = true
    setMapMeta(null)

    fetchMapMeta(selectedMap)
      .then((meta) => {
        if (active) {
          setMapMeta(meta)
        }
      })
      .catch((err) => {
        console.error("[auxcloud] failed to load map metadata", err)
      })

    return () => {
      active = false
    }
  }, [selectedMap])

  useEffect(() => {
    if (!mapMeta) {
      setEntities([])
      return
    }

    let cancelled = false

    const poll = async () => {
      try {
        const snapshot = await fetchMapSnapshot(selectedMap)
        if (!cancelled) {
          setEntities(toSceneEntities(snapshot, mapMeta))
        }
      } catch (err) {
        console.error("[auxcloud] failed to fetch live entities", err)
      }
    }

    void poll()
    const interval = window.setInterval(() => {
      void poll()
    }, AUXCLOUD_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [mapMeta, selectedMap])

  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.id === selectedEntityID) ?? null,
    [entities, selectedEntityID],
  )

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
            entities={entities}
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

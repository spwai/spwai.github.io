"use client"

import { useEffect, useState } from "react"
import { Box, Eye, Moon, RotateCcw, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface HeaderProps {
  selectedMap: string
  onMapChange: (map: string) => void
  onResetCamera: () => void
}

const maps = [
  { id: "ancient", name: "Ancient" },
  { id: "biomes", name: "Biomes" },
  { id: "canals", name: "Canals" },
  { id: "deeps", name: "Deeps" },
  { id: "halls", name: "Halls" },
  { id: "kingdom", name: "Kingdom" },
  { id: "mayan", name: "Mayan" },
  { id: "overworld", name: "Overworld" },
  { id: "savannah", name: "Savannah" },
  { id: "tropical", name: "Tropical" },
]

export function Header({ selectedMap, onMapChange, onResetCamera }: HeaderProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Auxilium</span>
        </div>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Sandbox Viewer</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedMap} onValueChange={onMapChange}>
          <SelectTrigger className="h-7 w-[140px] text-xs bg-secondary border-border">
            <SelectValue placeholder="Select map" />
          </SelectTrigger>
          <SelectContent>
            {maps.map((map) => (
              <SelectItem key={map.id} value={map.id} className="text-xs">
                {map.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onResetCamera}
          title="Reset camera"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </header>
  )
}

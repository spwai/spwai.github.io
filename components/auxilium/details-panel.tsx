"use client"

import { X, User, Shield, Crosshair } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Entity } from "@/lib/auxcloud"

interface DetailsPanelProps {
  entity: Entity | null
  onClose: () => void
}

export function DetailsPanel({ entity, onClose }: DetailsPanelProps) {
  if (!entity) {
    return (
      <div className="absolute top-3 right-3 w-56 bg-card border border-border rounded-md shadow-sm">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Details</span>
        </div>
        <div className="px-3 py-6 text-center">
          <div className="text-xs text-muted-foreground">No entity selected</div>
          <div className="text-[10px] text-muted-foreground/60 mt-1">
            Click a marker to view details
          </div>
        </div>
      </div>
    )
  }

  const TypeIcon =
    entity.category === "target"
      ? Crosshair
      : entity.category === "ally"
        ? Shield
        : User

  const typeColor =
    entity.category === "target"
      ? "text-red-500"
      : entity.category === "ally"
        ? "text-green-500"
        : "text-zinc-400"

  return (
    <div className="absolute top-3 right-3 w-56 bg-card border border-border rounded-md shadow-sm">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className={`h-3 w-3 ${typeColor}`} />
          <span className="text-xs font-medium text-foreground truncate">
            {entity.name}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="px-3 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Category</span>
          <span className="text-[10px] text-foreground capitalize">{entity.category}</span>
        </div>

        {entity.health !== null && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Health</span>
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(entity.health, 20)) * 5}%` }}
                />
              </div>
              <span className="text-[10px] text-foreground">{entity.health.toFixed(1)}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Position</span>
          <span className="text-[10px] text-foreground font-mono">
            {entity.worldPosition.map((p) => p.toFixed(1)).join(", ")}
          </span>
        </div>
      </div>
    </div>
  )
}

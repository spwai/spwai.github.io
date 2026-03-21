export type EntityCategory = "target" | "ally" | "default"

export interface MapMeta {
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

export interface RemoteEntity {
  username: string
  position: {
    x: number
    y: number
    z: number
  }
  health: number | null
  category: EntityCategory
}

export interface RemoteMapSnapshot {
  map: string
  updatedAt: number
  entities: RemoteEntity[]
}

export interface Entity {
  id: string
  name: string
  category: EntityCategory
  health: number | null
  worldPosition: [number, number, number]
  scenePosition: [number, number, number]
}

export const AUXCLOUD_BASE_URL = "https://ppg.spwai03.workers.dev"
export const AUXCLOUD_POLL_INTERVAL_MS = 500

export async function fetchMapMeta(mapId: string): Promise<MapMeta> {
  const res = await fetch(`/maps/${mapId}/meta.json`, { cache: "force-cache" })
  if (!res.ok) {
    throw new Error(`Failed to load map metadata for ${mapId}`)
  }
  return res.json()
}

export async function fetchMapSnapshot(mapId: string): Promise<RemoteMapSnapshot | null> {
  const res = await fetch(`${AUXCLOUD_BASE_URL}/maps/${mapId}`, { cache: "no-store" })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch live map snapshot for ${mapId}`)
  }
  return res.json()
}

export function toSceneEntities(snapshot: RemoteMapSnapshot | null, meta: MapMeta | null): Entity[] {
  if (!snapshot || !meta) {
    return []
  }

  return snapshot.entities.map((entity) => ({
    id: entity.username.toLowerCase(),
    name: entity.username,
    category: entity.category,
    health: entity.health,
    worldPosition: [entity.position.x, entity.position.y, entity.position.z],
    scenePosition: [
      entity.position.x - meta.bounds.minX,
      entity.position.y - meta.bounds.minY,
      entity.position.z - meta.bounds.minZ,
    ],
  }))
}

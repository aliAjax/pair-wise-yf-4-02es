import type { RouteArchive } from '@/types'

const ARCHIVE_KEY = 'bus_route_archives'

/** 数据只存本地（localStorage），刷新后保留 */
export function getAllArchives(): RouteArchive[] {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RouteArchive[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getArchiveById(id: string): RouteArchive | undefined {
  return getAllArchives().find((a) => a.id === id)
}

export function getArchiveByName(name: string): RouteArchive | undefined {
  return getAllArchives().find((a) => a.name === name)
}

function persist(archives: RouteArchive[]): void {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives))
}

export interface ArchiveInput {
  name: string
  /** 有序站点；第一个为起站，最后一个为讫站 */
  stations: { id: string; name: string }[]
}

/** 登记新档案：起讫站由有序站点序列的首尾决定 */
export function createArchive(input: ArchiveInput): RouteArchive {
  const now = new Date().toISOString()
  const archive: RouteArchive = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    stations: input.stations.map((s) => ({ id: s.id, name: s.name.trim() })),
    startStationId: input.stations[0].id,
    endStationId: input.stations[input.stations.length - 1].id,
    createdAt: now,
    updatedAt: now,
  }
  persist([...getAllArchives(), archive])
  return archive
}

/** 改写档案（含站点顺序）：起讫站随之更新 */
export function updateArchive(id: string, input: ArchiveInput): RouteArchive | undefined {
  let updated: RouteArchive | undefined
  const archives = getAllArchives().map((archive) => {
    if (archive.id !== id) return archive
    updated = {
      ...archive,
      name: input.name.trim(),
      stations: input.stations.map((s) => ({ id: s.id, name: s.name.trim() })),
      startStationId: input.stations[0].id,
      endStationId: input.stations[input.stations.length - 1].id,
      updatedAt: new Date().toISOString(),
    }
    return updated
  })
  if (updated) persist(archives)
  return updated
}

export function deleteArchive(id: string): void {
  persist(getAllArchives().filter((a) => a.id !== id))
}

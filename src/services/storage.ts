import type { WindowScene, VerifyStatus } from '@/types'
import { getAllArchives } from './routeArchive'

const STORAGE_KEY = 'bus_window_scenes'

/** 兼容档案功能上线前的旧记录：补齐核验相关字段 */
function normalize(raw: Partial<WindowScene>): WindowScene {
  const verifyStatus: VerifyStatus = raw.verifyStatus ?? 'verified'
  return {
    id: raw.id ?? crypto.randomUUID(),
    routeArchiveId: raw.routeArchiveId ?? '',
    routeName: raw.routeName ?? '',
    segment: raw.segment ?? '',
    fromStationId: raw.fromStationId ?? '',
    toStationId: raw.toStationId ?? '',
    verifyStatus,
    seatDirection: raw.seatDirection ?? '左',
    timestamp: raw.timestamp ?? new Date().toISOString(),
    weather: raw.weather ?? '晴',
    signText: raw.signText ?? '',
    treeDensity: raw.treeDensity ?? '适中',
    pedestrianStatus: raw.pedestrianStatus ?? '稀少',
    note: raw.note ?? '',
  }
}

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Partial<WindowScene>[]).map(normalize) : []
  } catch {
    return []
  }
}

function persist(scenes: WindowScene[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function saveScene(scene: WindowScene): void {
  persist([...getAllScenes(), scene])
}

/**
 * 移除记录。待核验中的记录不得移除——
 * 调用方应先做锁定校验，此处再兜底一次。
 * @returns 是否删除成功
 */
export function deleteScene(id: string): boolean {
  const target = getAllScenes().find((s) => s.id === id)
  if (target?.verifyStatus === 'pending') return false
  persist(getAllScenes().filter((s) => s.id !== id))
  return true
}

export function getScenesByRoute(routeName: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.routeName === routeName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getScenesByArchive(archiveId: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.routeArchiveId === archiveId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getPendingScenes(archiveId?: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.verifyStatus === 'pending' && (!archiveId || s.routeArchiveId === archiveId))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/** 档案站序改写后，把引用受影响区间的记录批量转入待核验 */
export function markScenesPending(ids: string[]): void {
  if (ids.length === 0) return
  const idSet = new Set(ids)
  const scenes = getAllScenes().map((s) =>
    idSet.has(s.id) ? { ...s, verifyStatus: 'pending' as const } : s
  )
  persist(scenes)
}

/** 核验通过：恢复为已核验，档案随之解锁 */
export function verifyScene(id: string): void {
  const scenes = getAllScenes().map((s) =>
    s.id === id ? { ...s, verifyStatus: 'verified' as const } : s
  )
  persist(scenes)
}

/** 出现过的线路名（旧记录名 + 档案名） */
export function getAllRouteNames(): string[] {
  const names = new Set(getAllScenes().map((s) => s.routeName))
  getAllArchives().forEach((a) => names.add(a.name))
  return Array.from(names).filter(Boolean).sort()
}

export function getRandomScene(): WindowScene | null {
  const scenes = getAllScenes()
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}

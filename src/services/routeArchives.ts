import type {
  RouteArchive,
  ArchiveDraft,
  WindowScene,
  SceneFormData,
  SaveResult,
  ArchiveUpdateResult,
} from '@/types'
import { validateSegment, validateArchiveDraft } from '@/utils/segmentRules'

/**
 * 线路档案业务文件（业务文件之二：档案）。
 * 职责：线路档案的登记 / 改写 / 注销，窗景记录的本地持久化与旧数据迁移，
 * 以及「站序改写 → 受影响记录待核验 → 档案锁定 → 核验通过解锁」的状态流转。
 * 数据只存 localStorage，刷新后保留。
 */

const ARCHIVE_KEY = 'bus_route_archives'
const SCENE_KEY = 'bus_window_scenes'

/* ---------------------------------- 档案 ---------------------------------- */

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

export function getArchive(id: string): RouteArchive | undefined {
  return getAllArchives().find((a) => a.id === id)
}

function persistArchives(archives: RouteArchive[]): void {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives))
}

/** 该档案下是否存在待核验记录。存在期间档案锁定，不得再改写。 */
export function isArchiveLocked(archiveId: string): boolean {
  return getPendingScenes(archiveId).length > 0
}

export function createArchive(draft: ArchiveDraft): SaveResult & { id?: string } {
  const error = validateArchiveDraft(draft)
  if (error) return { ok: false, error }

  const routeName = draft.routeName.trim()
  const stations = draft.stations.map((s) => s.trim()).filter(Boolean)
  const archives = getAllArchives()
  if (archives.some((a) => a.routeName === routeName)) {
    return { ok: false, error: '该线路档案已存在' }
  }

  const now = new Date().toISOString()
  const archive: RouteArchive = {
    id: crypto.randomUUID(),
    routeName,
    stations,
    createdAt: now,
    updatedAt: now,
  }
  archives.push(archive)
  persistArchives(archives)
  return { ok: true, id: archive.id }
}

/**
 * 改写档案（含站序改写）。
 * 若该档案下仍有待核验记录则拒绝；改写后引用失效区间的记录整体转入待核验，
 * 档案随即锁定，直到这些记录全部核验通过。
 */
export function updateArchive(id: string, draft: ArchiveDraft): ArchiveUpdateResult {
  const archives = getAllArchives()
  const index = archives.findIndex((a) => a.id === id)
  if (index === -1) return { ok: false, error: '线路档案不存在' }
  if (isArchiveLocked(id)) {
    return { ok: false, error: '该档案有待核验记录，核验通过前不能修改' }
  }

  const error = validateArchiveDraft(draft)
  if (error) return { ok: false, error }

  const routeName = draft.routeName.trim()
  const stations = draft.stations.map((s) => s.trim()).filter(Boolean)
  if (archives.some((a) => a.id !== id && a.routeName === routeName)) {
    return { ok: false, error: '已存在同名线路档案' }
  }

  const updated: RouteArchive = {
    ...archives[index],
    routeName,
    stations,
    updatedAt: new Date().toISOString(),
  }

  // 站序（或线路名）改写后，找出引用区间失效的记录转入待核验
  const scenes = getAllScenes()
  const affectedIds = new Set(
    scenes
      .filter((scene) => {
        if (scene.archiveId !== id) return false
        return validateSegment(updated, scene.fromStation, scene.toStation) !== null
      })
      .map((scene) => scene.id)
  )
  const nextScenes = scenes.map((scene) => {
    if (!affectedIds.has(scene.id)) return scene
    // 改名时同步线路名快照；失效区间一并标记待核验
    return { ...scene, routeName, status: '待核验' as const }
  })
  // 未失效的记录也同步改名后的线路名快照
  nextScenes.forEach((scene) => {
    if (scene.archiveId === id) scene.routeName = routeName
  })

  archives[index] = updated
  persistArchives(archives)
  persistScenes(nextScenes)

  return { ok: true, affectedCount: affectedIds.size }
}

/** 注销档案：仅当没有任何窗景记录引用它时允许（待核验记录更不得移除） */
export function deleteArchive(id: string): SaveResult {
  const scenes = getAllScenes()
  const referenced = scenes.some((s) => s.archiveId === id)
  if (referenced) {
    return { ok: false, error: '该线路下仍有窗景记录（含待核验记录），不能删除档案' }
  }
  const archives = getAllArchives().filter((a) => a.id !== id)
  persistArchives(archives)
  return { ok: true }
}

/* -------------------------------- 窗景记录 -------------------------------- */

function persistScenes(scenes: WindowScene[]): void {
  localStorage.setItem(SCENE_KEY, JSON.stringify(scenes))
}

/** 旧版记录只有一个自由文本 segment，按常见箭头/连接符拆成两站 */
function splitLegacySegment(segment: string): { from: string; to: string } {
  const parts = segment.split(/\s*(?:→|->|—|–|-|至|到)\s*/).filter(Boolean)
  if (parts.length >= 2) return { from: parts[0], to: parts[1] }
  return { from: '', to: '' }
}

/** 读取并规整历史数据：补齐档案化之后新增的字段 */
function normalize(raw: unknown): WindowScene {
  const s = raw as WindowScene
  if (s.fromStation !== undefined && s.status) return s

  const legacy = s as unknown as { segment?: string }
  const { from, to } = splitLegacySegment(legacy.segment ?? '')
  return {
    ...s,
    archiveId: '',
    fromStation: from,
    toStation: to,
    status: '正常',
  }
}

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(SCENE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize)
  } catch {
    return []
  }
}

export function getScenesByRoute(routeName: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.routeName === routeName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/** 时间线筛选来源：档案中的线路 + 档案化之前历史记录里的线路 */
export function getAllRouteNames(): string[] {
  const names = new Set<string>()
  getAllArchives().forEach((a) => names.add(a.routeName))
  getAllScenes().forEach((s) => s.routeName && names.add(s.routeName))
  return Array.from(names).sort()
}

export function getRandomScene(): WindowScene | null {
  const scenes = getAllScenes()
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}

export function getPendingScenes(archiveId?: string): WindowScene[] {
  return getAllScenes().filter(
    (s) => s.status === '待核验' && (!archiveId || s.archiveId === archiveId)
  )
}

/**
 * 保存窗景记录。区间必须来自所选线路档案中的顺向相邻两站；
 * 校验失败则整条退回——不落库，由调用方保留表单原样。
 */
export function saveSceneRecord(data: SceneFormData): SaveResult {
  const archive = getArchive(data.archiveId)
  const error = validateSegment(archive, data.fromStation, data.toStation)
  if (error || !archive) {
    return { ok: false, error: error ? errorMessage(error) : '线路档案不存在' }
  }

  const scene: WindowScene = {
    id: crypto.randomUUID(),
    archiveId: archive.id,
    routeName: archive.routeName,
    fromStation: data.fromStation,
    toStation: data.toStation,
    seatDirection: data.seatDirection,
    timestamp: new Date().toISOString(),
    weather: data.weather,
    signText: data.signText,
    treeDensity: data.treeDensity,
    pedestrianStatus: data.pedestrianStatus,
    note: data.note,
    status: '正常',
  }
  const scenes = getAllScenes()
  scenes.push(scene)
  persistScenes(scenes)
  return { ok: true }
}

function errorMessage(code: string): string {
  const map: Record<string, string> = {
    ARCHIVE_MISSING: '请先在「档案」页登记该线路的站点档案',
    STATION_MISSING: '请从所选线路档案中选择发站与到站',
    SAME_STATION: '发站与到站不能相同',
    NOT_ADJACENT: '只能选取档案中相邻的两站组成区间，整条已退回',
    WRONG_DIRECTION: '区间方向与档案站序不符，整条已退回',
  }
  return map[code] ?? '区间不符合档案站序，整条已退回'
}

/** 删除窗景：待核验记录不得移除（必须先核验通过） */
export function deleteSceneRecord(id: string): SaveResult {
  const scenes = getAllScenes()
  const target = scenes.find((s) => s.id === id)
  if (target?.status === '待核验') {
    return { ok: false, error: '该记录待核验，核验通过前不能移除' }
  }
  persistScenes(scenes.filter((s) => s.id !== id))
  return { ok: true }
}

/**
 * 核验一条待核验记录：将其改挂到档案当前站序下的顺向相邻区间后通过。
 * 通过后若该档案已无待核验记录，档案自然解锁。
 */
export function verifyScene(
  id: string,
  nextSegment: { from: string; to: string }
): SaveResult {
  const scenes = getAllScenes()
  const target = scenes.find((s) => s.id === id)
  if (!target) return { ok: false, error: '记录不存在' }
  const archive = getArchive(target.archiveId)
  if (!archive) return { ok: false, error: '关联的线路档案已不存在' }

  const error = validateSegment(archive, nextSegment.from, nextSegment.to)
  if (error) return { ok: false, error: '核验改挂的区间必须是档案中的顺向相邻区间' }

  target.fromStation = nextSegment.from
  target.toStation = nextSegment.to
  target.status = '正常'
  persistScenes(scenes)
  return { ok: true }
}

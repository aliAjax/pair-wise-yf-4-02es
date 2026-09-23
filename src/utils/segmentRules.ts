import type { RouteArchive, WindowScene } from '@/types'

/**
 * 站序区间校验规则（业务文件之一：规则）。
 * 纯函数，不接触 localStorage：给定线路档案与区间起讫站，判定是否合规；
 * 档案站序被改写后，据此找出引用了失效区间、需转入待核验的记录。
 */

export type SegmentError =
  | 'ARCHIVE_MISSING'
  | 'STATION_MISSING'
  | 'SAME_STATION'
  | 'NOT_ADJACENT'
  | 'WRONG_DIRECTION'

export const SEGMENT_ERROR_MESSAGES: Record<SegmentError, string> = {
  ARCHIVE_MISSING: '请先在「档案」页登记该线路的站点档案',
  STATION_MISSING: '请从所选线路档案中选择发站与到站',
  SAME_STATION: '发站与到站不能相同',
  NOT_ADJACENT: '只能选取档案中相邻的两站组成区间',
  WRONG_DIRECTION: '区间方向与档案站序不符（只能按起点→终点方向记录，整条已退回）',
}

/** 生成档案中全部顺向相邻区间，如 [A,B,C] => [{from:'A',to:'B'},{from:'B',to:'C'}] */
export function getAdjacentSegments(archive: RouteArchive): { from: string; to: string }[] {
  const result: { from: string; to: string }[] = []
  for (let i = 0; i < archive.stations.length - 1; i++) {
    result.push({ from: archive.stations[i], to: archive.stations[i + 1] })
  }
  return result
}

/** 区间的展示文案 */
export function segmentLabel(from: string, to: string): string {
  return `${from} → ${to}`
}

/** 从一条窗景记录中取区间文案，兼容尚未档案化的历史数据 */
export function getSceneSegment(scene: WindowScene): string {
  if (scene.fromStation && scene.toStation) {
    return segmentLabel(scene.fromStation, scene.toStation)
  }
  return scene.routeName ? '未登记区间' : ''
}

/** 校验记录表单所选两站是否构成档案中的顺向相邻区间 */
export function validateSegment(
  archive: RouteArchive | undefined,
  fromStation: string,
  toStation: string
): SegmentError | null {
  if (!archive) return 'ARCHIVE_MISSING'
  if (!fromStation || !toStation) return 'STATION_MISSING'
  if (fromStation === toStation) return 'SAME_STATION'

  const fromIdx = archive.stations.indexOf(fromStation)
  const toIdx = archive.stations.indexOf(toStation)
  if (fromIdx === -1 || toIdx === -1) return 'STATION_MISSING'

  if (toIdx === fromIdx + 1) return null // 顺向相邻
  // 两站在档案中相邻但顺序相反：方向不符，整条退回
  if (toIdx === fromIdx - 1) return 'WRONG_DIRECTION'
  return 'NOT_ADJACENT'
}

/**
 * 档案站序改写后，筛出引用区间在新站序下失效的记录。
 * 已处于待核验的记录保持原状（不得移除），正常记录中区间失效的需要转入待核验。
 */
export function findAffectedScenes(
  scenes: WindowScene[],
  newArchive: RouteArchive
): WindowScene[] {
  return scenes.filter((scene) => {
    if (scene.archiveId !== newArchive.id) return false
    return validateSegment(newArchive, scene.fromStation, scene.toStation) !== null
  })
}

/** 给核验界面描述一条区间为何失效 */
export function describeSegmentProblem(
  archive: RouteArchive,
  fromStation: string,
  toStation: string
): string {
  const error = validateSegment(archive, fromStation, toStation)
  if (!error) return '区间仍然有效'
  if (error === 'WRONG_DIRECTION') return '原区间方向与新站序相反'
  if (error === 'NOT_ADJACENT') return '原区间两站在新站序中不再相邻'
  if (error === 'STATION_MISSING') return '原区间含已不在档案中的站点'
  if (error === 'SAME_STATION') return '原区间发到站相同'
  return SEGMENT_ERROR_MESSAGES[error]
}

/** 核验时推荐的改挂区间：优先保留发站，找其顺向相邻的下一站 */
export function suggestSegment(
  archive: RouteArchive,
  fromStation: string
): { from: string; to: string } | null {
  const idx = archive.stations.indexOf(fromStation)
  if (idx >= 0 && idx < archive.stations.length - 1) {
    return { from: archive.stations[idx], to: archive.stations[idx + 1] }
  }
  const segments = getAdjacentSegments(archive)
  return segments[0] ?? null
}

/** 校验档案草稿本身：线路名与站点是否足够登记 */
export function validateArchiveDraft(draft: {
  routeName: string
  stations: string[]
}): string | null {
  const routeName = draft.routeName.trim()
  if (!routeName) return '请填写线路名'
  const stations = draft.stations.map((s) => s.trim()).filter(Boolean)
  if (stations.length < 2) return '至少需要登记起点站与终点站两站'
  if (new Set(stations).size !== stations.length) return '站点不能重名，请调整站序'
  return null
}

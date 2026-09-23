export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

/** 窗景记录的核验状态：档案站序改写后，受影响区间的记录会转入「待核验」 */
export type SceneStatus = '正常' | '待核验'

/**
 * 线路档案：登记一条线路的起讫站与有序途经站。
 * stations[0] 为起点站，stations[length-1] 为终点站，中间均为有序途经站。
 */
export interface RouteArchive {
  id: string
  routeName: string
  stations: string[]
  createdAt: string
  updatedAt: string
}

/** 档案编辑草稿（新建 / 修改共用） */
export interface ArchiveDraft {
  routeName: string
  stations: string[]
}

export interface WindowScene {
  id: string
  /** 所属线路档案；档案化之前的历史记录为空字符串 */
  archiveId: string
  /** 记录时的线路名快照（随档案改名同步） */
  routeName: string
  /** 区间发站（须为档案中的顺向相邻站） */
  fromStation: string
  /** 区间到站 */
  toStation: string
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
  status: SceneStatus
}

export interface SceneFormData {
  archiveId: string
  fromStation: string
  toStation: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

/** 写入类操作的统一结果：失败时携带原因，调用方据此决定是否保留表单 */
export type SaveResult = { ok: true } | { ok: false; error: string }

/** 修改档案的结果：成功时回报受影响（转入待核验）的记录条数 */
export type ArchiveUpdateResult =
  | { ok: true; affectedCount: number }
  | { ok: false; error: string }

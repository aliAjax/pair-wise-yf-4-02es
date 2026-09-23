export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

/** 核验状态：待核验的记录在核验通过前不得移除，且会锁定线路档案 */
export type VerifyStatus = 'verified' | 'pending'

/** 线路档案中的有序站点（首站为起站、末站为讫站） */
export interface RouteStation {
  id: string
  name: string
}

/** 线路档案：登记起讫站与有序途经站 */
export interface RouteArchive {
  id: string
  name: string
  /** 完整有序站点序列，stations[0] 为起站，末位为讫站 */
  stations: RouteStation[]
  startStationId: string
  endStationId: string
  createdAt: string
  updatedAt: string
}

export interface WindowScene {
  id: string
  /** 所属线路档案；档案功能上线前的旧记录为空字符串 */
  routeArchiveId: string
  /** 记录时的线路名快照，便于展示 */
  routeName: string
  /** 记录时的区间名快照，便于展示 */
  segment: string
  /** 区间起点站 id */
  fromStationId: string
  /** 区间讫点站 id */
  toStationId: string
  verifyStatus: VerifyStatus
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

export interface SceneFormData {
  routeArchiveId: string
  fromStationId: string
  toStationId: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

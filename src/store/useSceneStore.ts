import { create } from 'zustand'
import type { WindowScene, SceneFormData, RouteArchive } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
  getPendingScenes,
  markScenesPending,
  verifyScene as storageVerifyScene,
} from '@/services/storage'
import {
  getAllArchives,
  getArchiveById,
  createArchive as storageCreateArchive,
  updateArchive as storageUpdateArchive,
  deleteArchive as storageDeleteArchive,
  type ArchiveInput,
} from '@/services/routeArchive'
import { validateSegment, segmentName, diffAffectedScenes, archiveIsLocked } from '@/utils/segmentValidation'

export interface SaveSceneResult {
  ok: boolean
  message?: string
  /** 档案站序改写后转入待核验的记录数 */
  affectedCount?: number
}

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  archives: RouteArchive[]
  currentRouteScenes: WindowScene[]
  pendingScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null

  loadAll: () => void
  saveScene: (data: SceneFormData) => SaveSceneResult
  deleteScene: (id: string) => boolean
  verifyScene: (id: string) => void
  selectRoute: (routeName: string) => void
  refreshRandom: () => void

  isArchiveLocked: (archiveId: string) => boolean
  createArchive: (input: ArchiveInput) => void
  /** 改写档案；若该档案有待核验记录则拒绝 */
  saveArchive: (id: string, input: ArchiveInput) => SaveSceneResult
  removeArchive: (id: string) => SaveSceneResult
}

export const useSceneStore = create<SceneState>((set, get) => {
  /** 每次变更后从 localStorage 重新汇总数据，保证刷新前后一致 */
  const hydrate = (selectedRoute?: string) => {
    const route = selectedRoute ?? get().selectedRoute
    return {
      scenes: getAllScenes(),
      routeNames: getAllRouteNames(),
      archives: getAllArchives(),
      currentRouteScenes: route ? getScenesByRoute(route) : [],
      pendingScenes: getPendingScenes(),
    }
  }

  return {
    scenes: [],
    routeNames: [],
    archives: [],
    currentRouteScenes: [],
    pendingScenes: [],
    selectedRoute: '',
    randomScene: null,

    loadAll: () => set(hydrate()),

    saveScene: (data) => {
      // 记录前按所选档案做站序区间校验，不通过则整条退回（不触达任何已有数据）
      const archive = getArchiveById(data.routeArchiveId)
      const check = validateSegment(archive, data.fromStationId, data.toStationId)
      if (!check.valid || !archive) {
        return { ok: false, message: check.message }
      }

      const scene: WindowScene = {
        ...data,
        id: crypto.randomUUID(),
        routeName: archive.name,
        segment: segmentName(archive, data.fromStationId, data.toStationId),
        verifyStatus: 'verified',
        timestamp: new Date().toISOString(),
      }
      storageSaveScene(scene)
      set(hydrate())
      return { ok: true }
    },

    deleteScene: (id) => {
      // 待核验记录不得移除
      const removed = storageDeleteScene(id)
      if (removed) set(hydrate())
      return removed
    },

    verifyScene: (id) => {
      storageVerifyScene(id)
      set(hydrate())
    },

    selectRoute: (routeName) => {
      set({
        selectedRoute: routeName,
        currentRouteScenes: routeName ? getScenesByRoute(routeName) : [],
      })
    },

    refreshRandom: () => {
      set({ randomScene: getRandomScene() })
    },

    isArchiveLocked: (archiveId) => archiveIsLocked(get().scenes, archiveId),

    createArchive: (input) => {
      storageCreateArchive(input)
      set(hydrate())
    },

    saveArchive: (id, input) => {
      const archive = getArchiveById(id)
      if (!archive) return { ok: false, message: '档案不存在' }

      // 核验通过前不能再改档案
      if (archiveIsLocked(get().scenes, id)) {
        return { ok: false, message: '该档案有待核验记录，核验通过前不能改写站序' }
      }

      const updated = storageUpdateArchive(id, input)
      if (!updated) return { ok: false, message: '档案保存失败' }

      // 站序改写后，引用受影响区间的记录转入待核验（且不得移除）
      const affected = diffAffectedScenes(getAllScenes(), id, updated.stations)
      if (affected.length > 0) markScenesPending(affected.map((s) => s.id))

      set(hydrate())
      return { ok: true, affectedCount: affected.length } as SaveSceneResult
    },

    removeArchive: (id) => {
      // 核验通过前不能移除档案
      if (archiveIsLocked(get().scenes, id)) {
        return { ok: false, message: '该档案有待核验记录，核验通过前不能移除' }
      }
      storageDeleteArchive(id)
      set(hydrate())
      return { ok: true }
    },
  }
})

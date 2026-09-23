import { create } from 'zustand'
import type {
  WindowScene,
  SceneFormData,
  RouteArchive,
  ArchiveDraft,
  SaveResult,
  ArchiveUpdateResult,
} from '@/types'
import {
  getAllScenes,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
  getAllArchives,
  createArchive,
  updateArchive,
  deleteArchive,
  saveSceneRecord,
  deleteSceneRecord,
  verifyScene,
  getPendingScenes,
} from '@/services/routeArchives'

interface SceneState {
  scenes: WindowScene[]
  archives: RouteArchive[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null

  loadAll: () => void
  saveScene: (data: SceneFormData) => SaveResult
  deleteScene: (id: string) => SaveResult
  selectRoute: (routeName: string) => void
  refreshRandom: () => void

  addArchive: (draft: ArchiveDraft) => SaveResult & { id?: string }
  editArchive: (id: string, draft: ArchiveDraft) => ArchiveUpdateResult
  removeArchive: (id: string) => SaveResult
  approveScene: (id: string, nextSegment: { from: string; to: string }) => SaveResult
  pendingScenes: (archiveId?: string) => WindowScene[]
}

export const useSceneStore = create<SceneState>((set) => ({
  scenes: [],
  archives: [],
  routeNames: [],
  currentRouteScenes: [],
  selectedRoute: '',
  randomScene: null,

  loadAll: () => {
    const scenes = getAllScenes()
    const archives = getAllArchives()
    const routeNames = getAllRouteNames()
    set((state) => ({
      scenes,
      archives,
      routeNames,
      currentRouteScenes: state.selectedRoute
        ? getScenesByRoute(state.selectedRoute)
        : [],
    }))
  },

  saveScene: (data) => {
    const result = saveSceneRecord(data)
    if (result.ok === false) return result // 校验失败整条退回：不动已有数据与界面状态
    set((state) => ({
      scenes: getAllScenes(),
      routeNames: getAllRouteNames(),
      currentRouteScenes: state.selectedRoute
        ? getScenesByRoute(state.selectedRoute)
        : [],
    }))
    return result
  },

  deleteScene: (id) => {
    const result = deleteSceneRecord(id)
    if (result.ok === false) return result
    set((state) => ({
      scenes: getAllScenes(),
      routeNames: getAllRouteNames(),
      currentRouteScenes: state.selectedRoute
        ? getScenesByRoute(state.selectedRoute)
        : [],
    }))
    return result
  },

  selectRoute: (routeName) => {
    const currentRouteScenes = routeName ? getScenesByRoute(routeName) : []
    set({ selectedRoute: routeName, currentRouteScenes })
  },

  refreshRandom: () => {
    set({ randomScene: getRandomScene() })
  },

  addArchive: (draft) => {
    const result = createArchive(draft)
    if (result.ok) {
      set({ archives: getAllArchives(), routeNames: getAllRouteNames() })
    }
    return result
  },

  editArchive: (id, draft) => {
    const result = updateArchive(id, draft)
    if (result.ok) {
      set((state) => ({
        archives: getAllArchives(),
        scenes: getAllScenes(),
        routeNames: getAllRouteNames(),
        currentRouteScenes: state.selectedRoute
          ? getScenesByRoute(state.selectedRoute)
          : [],
      }))
    }
    return result
  },

  removeArchive: (id) => {
    const result = deleteArchive(id)
    if (result.ok) {
      set({ archives: getAllArchives(), routeNames: getAllRouteNames() })
    }
    return result
  },

  approveScene: (id, nextSegment) => {
    const result = verifyScene(id, nextSegment)
    if (result.ok) {
      set((state) => ({
        scenes: getAllScenes(),
        currentRouteScenes: state.selectedRoute
          ? getScenesByRoute(state.selectedRoute)
          : [],
      }))
    }
    return result
  },

  pendingScenes: (archiveId) => getPendingScenes(archiveId),
}))

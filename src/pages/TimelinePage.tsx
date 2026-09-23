import { useEffect, useState } from 'react'
import { Search, Route, X, Trash2, Clock, MapPin, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import type { WindowScene } from '@/types'

export default function TimelinePage() {
  const {
    routeNames, selectedRoute, currentRouteScenes, scenes, pendingScenes,
    selectRoute, loadAll, deleteScene, verifyScene,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  const baseScenes = pendingOnly
    ? scenes.filter((s) => s.verifyStatus === 'pending')
    : currentRouteScenes

  const sorted = [...baseScenes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // 弹窗里的记录可能已被核验，用 store 中的最新数据回填
  const detail = detailScene ? scenes.find((s) => s.id === detailScene.id) ?? null : null

  const handleDelete = (id: string) => {
    const removed = deleteScene(id)
    if (removed) setDetailScene(null)
  }

  const handleVerify = (id: string) => {
    verifyScene(id)
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-dusk-400">
          窗景时间线
        </h1>

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索路线..."
              className="w-full rounded-lg border border-teal-800 bg-teal-900/60 py-2.5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { selectRoute(''); setPendingOnly(false) }}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                !selectedRoute && !pendingOnly
                  ? 'bg-dusk-400 text-teal-950'
                  : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => { selectRoute(''); setPendingOnly(true) }}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                pendingOnly
                  ? 'bg-amber-500 text-teal-950'
                  : 'bg-teal-900 text-amber-300/80 hover:bg-teal-800'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              待核验{pendingScenes.length > 0 ? ` ${pendingScenes.length}` : ''}
            </button>
            {!pendingOnly && filteredRoutes.map((name) => (
              <button
                key={name}
                onClick={() => { setPendingOnly(false); selectRoute(name) }}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  selectedRoute === name
                    ? 'bg-dusk-400 text-teal-950'
                    : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                }`}
              >
                <Route className="mr-1 inline w-3 h-3" />
                {name}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">🪟</div>
            <p className="text-lg">
              {pendingOnly
                ? '没有待核验的窗景记录'
                : selectedRoute
                  ? '该路线暂无窗景记录'
                  : '选择一条路线，开始浏览窗景'}
            </p>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-teal-800" />
            <div className="space-y-6">
              {sorted.map((scene) => (
                <div key={scene.id} className="relative flex gap-4">
                  <div className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-teal-950 ${scene.verifyStatus === 'pending' ? 'bg-amber-400' : 'bg-dusk-400'}`} />
                  <div className="w-20 shrink-0 pt-0.5 text-right">
                    <p className="text-xs text-dusk-400">
                      {formatTimestamp(scene.timestamp)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-mist-500">
                      {getTimeOfDay(scene.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailScene(scene)}
                    className="group flex-1 rounded-xl border border-teal-800 bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getWeatherIcon(scene.weather)}
                      <span className="text-sm font-semibold text-mist-100">
                        {scene.segment}
                      </span>
                      {scene.verifyStatus === 'pending' && (
                        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] text-amber-300">
                          <ShieldAlert className="w-3 h-3" />待核验
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mb-1.5 text-mist-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs">{scene.routeName}</span>
                      <span className="mx-1 text-teal-700">·</span>
                      <span className="text-xs">{scene.seatDirection}侧</span>
                    </div>
                    {scene.note && (
                      <p className="text-xs text-mist-400 line-clamp-2">
                        {scene.note}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {getTreeIcon(scene.treeDensity)}
                      {getPedestrianIcon(scene.pedestrianStatus)}
                      {scene.signText && (
                        <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
                          {scene.signText}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailScene(null)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailScene(null)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              {getWeatherIcon(detail.weather)}
              <h2 className="text-xl font-bold text-dusk-400">{detail.segment}</h2>
            </div>

            {detail.verifyStatus === 'pending' && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-900/50 bg-amber-950/30 px-3 py-2.5 text-xs text-amber-300">
                <ShieldAlert className="mt-0.5 w-4 h-4 shrink-0" />
                <span>
                  线路档案站序改写后，该记录引用的区间不再相邻同向，转入待核验。
                  确认实际区间无误后请核验通过；核验通过前该记录不得移除。
                </span>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{detail.routeName}</span>
                <span className="text-teal-600">·</span>
                <span>{detail.seatDirection}侧</span>
              </div>
              <div className="flex items-center gap-2 text-mist-300">
                <Clock className="w-4 h-4 text-dusk-400" />
                <span>{formatTimestamp(detail.timestamp)}</span>
                <span className="text-teal-600">·</span>
                <span>{getTimeOfDay(detail.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-mist-300">
                {getTreeIcon(detail.treeDensity)}
                <span>{detail.treeDensity}</span>
                {getPedestrianIcon(detail.pedestrianStatus)}
                <span>{detail.pedestrianStatus}</span>
              </div>
              {detail.signText && (
                <div className="rounded-lg bg-teal-800/50 px-3 py-2 text-mist-200">
                  招牌: {detail.signText}
                </div>
              )}
              {detail.note && (
                <div className="rounded-lg border border-teal-800 px-3 py-2 text-mist-300">
                  {detail.note}
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2">
              {detail.verifyStatus === 'pending' && (
                <button
                  onClick={() => handleVerify(detail.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-dusk-400 py-2.5 text-sm font-medium text-teal-950 transition-colors hover:bg-dusk-300"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  核验通过
                </button>
              )}
              <button
                onClick={() => handleDelete(detail.id)}
                disabled={detail.verifyStatus === 'pending'}
                title={detail.verifyStatus === 'pending' ? '待核验记录不得移除' : undefined}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm transition-colors ${
                  detail.verifyStatus === 'pending'
                    ? 'cursor-not-allowed bg-teal-800/40 text-mist-600'
                    : 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {detail.verifyStatus === 'pending' ? '待核验中，不得移除' : '删除此窗景'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

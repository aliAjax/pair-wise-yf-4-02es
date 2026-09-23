import { useEffect, useMemo, useState } from 'react'
import {
  Route as RouteIcon, Plus, Pencil, Trash2, X, ShieldAlert, CheckCircle2,
  ChevronUp, ChevronDown, ArrowRight, MapPin,
} from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { formatTimestamp } from '@/utils/sceneHelpers'
import { validateArchiveDraft } from '@/utils/segmentValidation'
import type { RouteArchive } from '@/types'

interface StationRow {
  id: string
  name: string
}

interface EditorState {
  archiveId: string | null
  name: string
  stations: StationRow[]
}

const newStationRow = (): StationRow => ({ id: crypto.randomUUID(), name: '' })

function archiveToEditor(archive: RouteArchive): EditorState {
  return {
    archiveId: archive.id,
    name: archive.name,
    stations: archive.stations.map((s) => ({ ...s })),
  }
}

export default function ArchivesPage() {
  const {
    archives, scenes, loadAll, createArchive, saveArchive, removeArchive, verifyScene,
  } = useSceneStore()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => { loadAll() }, [loadAll])

  const lockedIds = useMemo(() => {
    const ids = new Set<string>()
    scenes.forEach((s) => {
      if (s.verifyStatus === 'pending') ids.add(s.routeArchiveId)
    })
    return ids
  }, [scenes])

  const pendingByArchive = useMemo(() => {
    const map = new Map<string, number>()
    scenes.forEach((s) => {
      if (s.verifyStatus === 'pending') {
        map.set(s.routeArchiveId, (map.get(s.routeArchiveId) ?? 0) + 1)
      }
    })
    return map
  }, [scenes])

  const openCreate = () => {
    setEditor({ archiveId: null, name: '', stations: [newStationRow(), newStationRow()] })
    setError('')
    setNotice('')
  }

  const openEdit = (archive: RouteArchive) => {
    setEditor(archiveToEditor(archive))
    setError('')
    setNotice('')
  }

  const updateStation = (index: number, name: string) => {
    setEditor((prev) => {
      if (!prev) return prev
      const stations = prev.stations.map((s, i) => (i === index ? { ...s, name } : s))
      return { ...prev, stations }
    })
  }

  const moveStation = (index: number, delta: -1 | 1) => {
    setEditor((prev) => {
      if (!prev) return prev
      const target = index + delta
      if (target < 0 || target >= prev.stations.length) return prev
      const stations = [...prev.stations]
      ;[stations[index], stations[target]] = [stations[target], stations[index]]
      return { ...prev, stations }
    })
  }

  const addStation = () => {
    setEditor((prev) => (prev ? { ...prev, stations: [...prev.stations, newStationRow()] } : prev))
  }

  const removeStation = (index: number) => {
    setEditor((prev) => {
      if (!prev || prev.stations.length <= 2) return prev
      return { ...prev, stations: prev.stations.filter((_, i) => i !== index) }
    })
  }

  const handleSave = () => {
    if (!editor) return
    setError('')
    setNotice('')

    const filled = editor.stations.filter((s) => s.name.trim())
    const draft = { name: editor.name, stations: editor.stations }
    const check = validateArchiveDraft(draft)
    if (!check.valid) {
      setError(check.message ?? '档案信息不完整')
      return
    }

    const input = { name: editor.name, stations: filled }
    if (editor.archiveId) {
      const result = saveArchive(editor.archiveId, input)
      if (!result.ok) {
        setError(result.message ?? '保存失败')
        return
      }
      setNotice(
        result.affectedCount && result.affectedCount > 0
          ? `站序已改写，${result.affectedCount} 条引用受影响区间的记录已转入待核验`
          : '档案已更新，现有记录均未受影响'
      )
    } else {
      createArchive(input)
      setNotice('线路档案已登记')
    }
    setEditor(null)
  }

  const handleDelete = (archive: RouteArchive) => {
    const result = removeArchive(archive.id)
    if (!result.ok) {
      setNotice('')
      setError(result.message ?? '档案无法移除')
    }
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-wide text-dusk-400">线路档案</h1>
            <p className="mt-1 text-sm text-mist-400">登记起讫站与有序途经站，记录窗景时只能选取档案中相邻两站的区间</p>
          </div>
          <button
            onClick={openCreate}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-dusk-400 px-4 py-2 text-sm text-teal-950 transition-colors hover:bg-dusk-300"
          >
            <Plus className="w-4 h-4" />登记线路
          </button>
        </div>

        {notice && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-dusk-400/30 bg-dusk-400/10 px-4 py-3 text-sm text-dusk-300">
            <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            <ShieldAlert className="mt-0.5 w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {archives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <RouteIcon className="mb-4 w-14 h-14 opacity-30" />
            <p className="text-lg">还没有线路档案</p>
            <p className="mt-1 text-sm">先登记一条线路的起讫站与途经站，再去记录窗景</p>
          </div>
        ) : (
          <div className="space-y-4">
            {archives.map((archive) => {
              const locked = lockedIds.has(archive.id)
              const pendingCount = pendingByArchive.get(archive.id) ?? 0
              const archiveScenes = scenes
                .filter((s) => s.routeArchiveId === archive.id)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

              return (
                <section
                  key={archive.id}
                  className="rounded-2xl border border-teal-800 bg-teal-900/50 p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <RouteIcon className="w-5 h-5 text-dusk-400" />
                      <h2 className="text-lg font-semibold text-mist-100">{archive.name}</h2>
                      {locked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 px-2.5 py-0.5 text-xs text-amber-300">
                          <ShieldAlert className="w-3 h-3" />待核验锁定
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => (locked ? setError('该档案有待核验记录，核验通过前不能改写站序') : openEdit(archive))}
                        disabled={locked}
                        className={`rounded-lg p-2 transition-colors ${locked ? 'cursor-not-allowed text-mist-600 opacity-40' : 'text-mist-300 hover:bg-teal-800 hover:text-dusk-300'}`}
                        title={locked ? '核验通过前不能改写' : '改写档案'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(archive)}
                        disabled={locked}
                        className={`rounded-lg p-2 transition-colors ${locked ? 'cursor-not-allowed text-mist-600 opacity-40' : 'text-mist-300 hover:bg-red-900/40 hover:text-red-300'}`}
                        title={locked ? '核验通过前不能移除' : '移除档案'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 有序站点：首站起站、末站讫站 */}
                  <ol className="flex flex-wrap items-center gap-y-2 text-sm">
                    {archive.stations.map((station, i) => (
                      <li key={station.id} className="flex items-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                            i === 0 || i === archive.stations.length - 1
                              ? 'bg-dusk-400/20 text-dusk-300'
                              : 'bg-teal-800/70 text-mist-300'
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          {station.name}
                          {i === 0 && <span className="text-[10px] text-dusk-400/80">起</span>}
                          {i === archive.stations.length - 1 && <span className="text-[10px] text-dusk-400/80">讫</span>}
                        </span>
                        {i < archive.stations.length - 1 && (
                          <ArrowRight className="mx-1 w-3.5 h-3.5 text-mist-500" />
                        )}
                      </li>
                    ))}
                  </ol>

                  <p className="mt-3 text-xs text-mist-500">
                    共 {archive.stations.length} 站 · {archiveScenes.length} 条窗景记录
                    {pendingCount > 0 && (
                      <span className="ml-1 text-amber-400">· {pendingCount} 条待核验</span>
                    )}
                  </p>

                  {locked && (
                    <div className="mt-4 space-y-2 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        站序改写后以下记录引用的区间受影响，核验通过前档案保持锁定
                      </p>
                      {archiveScenes
                        .filter((s) => s.verifyStatus === 'pending')
                        .map((scene) => (
                          <div
                            key={scene.id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-teal-900/70 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs text-mist-200">{scene.segment}</p>
                              <p className="text-[10px] text-mist-500">{formatTimestamp(scene.timestamp)}</p>
                            </div>
                            <button
                              onClick={() => verifyScene(scene.id)}
                              className="flex shrink-0 items-center gap-1 rounded-full bg-dusk-400/20 px-3 py-1 text-xs text-dusk-300 transition-colors hover:bg-dusk-400/30"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />核验通过
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {/* 档案编辑器：改写站点顺序后保存即触发受影响区间流转 */}
      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setEditor(null)}
        >
          <div
            className="relative mx-4 max-h-[85vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditor(null)}
              className="absolute right-4 top-4 text-mist-400 transition-colors hover:text-mist-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="mb-5 text-xl font-bold text-dusk-400">
              {editor.archiveId ? '改写线路档案' : '登记线路档案'}
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-xs text-mist-300">线路名称</label>
                <input
                  className="w-full rounded-xl bg-teal-850 px-3 py-2 text-sm text-mist-100 outline-none focus:ring-1 focus:ring-dusk-400"
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  placeholder="如：20 路"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-mist-300">有序站点（首站为起站，末站为讫站）</label>
                  <button
                    onClick={addStation}
                    className="flex items-center gap-1 text-xs text-dusk-400 hover:text-dusk-300"
                  >
                    <Plus className="w-3.5 h-3.5" />加一站
                  </button>
                </div>
                <div className="space-y-2">
                  {editor.stations.map((station, i) => {
                    const isEndpoint = i === 0 || i === editor.stations.length - 1
                    return (
                      <div key={station.id} className="flex items-center gap-2">
                        <span
                          className={`w-6 shrink-0 text-center text-[10px] ${isEndpoint ? 'text-dusk-400' : 'text-mist-500'}`}
                        >
                          {i === 0 ? '起' : i === editor.stations.length - 1 ? '讫' : i + 1}
                        </span>
                        <input
                          className="flex-1 rounded-xl bg-teal-850 px-3 py-2 text-sm text-mist-100 outline-none focus:ring-1 focus:ring-dusk-400"
                          value={station.name}
                          onChange={(e) => updateStation(i, e.target.value)}
                          placeholder={`第 ${i + 1} 站`}
                        />
                        <div className="flex shrink-0 flex-col">
                          <button
                            onClick={() => moveStation(i, -1)}
                            disabled={i === 0}
                            className="text-mist-400 transition-colors hover:text-dusk-300 disabled:opacity-25"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveStation(i, 1)}
                            disabled={i === editor.stations.length - 1}
                            className="text-mist-400 transition-colors hover:text-dusk-300 disabled:opacity-25"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeStation(i)}
                          disabled={editor.stations.length <= 2}
                          className="shrink-0 rounded-lg p-1.5 text-mist-400 transition-colors hover:bg-red-900/40 hover:text-red-300 disabled:opacity-25"
                          title="至少保留起讫两站"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-mist-500">
                  调整站点顺序并保存后，引用了受影响区间的窗景记录将转入待核验，
                  全部核验通过前不能再次改写或移除本档案。
                </p>
              </div>

              {error && <p className="text-xs text-red-300">{error}</p>}

              <button
                onClick={handleSave}
                className="w-full rounded-xl bg-dusk-400 py-3 text-sm font-medium text-teal-950 transition hover:bg-dusk-300"
              >
                保存档案
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

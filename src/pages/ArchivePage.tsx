import { useEffect, useMemo, useState } from 'react'
import {
  Waypoints, Plus, Pencil, Trash2, X, ShieldAlert, CheckCircle2,
  ArrowRight, Lock, AlertTriangle, Clock,
} from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  getAdjacentSegments,
  segmentLabel,
  describeSegmentProblem,
  suggestSegment,
} from '@/utils/segmentRules'
import { formatTimestamp } from '@/utils/sceneHelpers'
import type { RouteArchive, WindowScene } from '@/types'

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; archive: RouteArchive }

const emptyDraft = { routeName: '', stations: ['', ''] }

export default function ArchivePage() {
  const {
    archives, scenes, loadAll, addArchive, editArchive, removeArchive,
    approveScene,
  } = useSceneStore()
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [verifying, setVerifying] = useState<WindowScene | null>(null)

  useEffect(() => { loadAll() }, [loadAll])

  const pendingByArchive = useMemo(() => {
    const map = new Map<string, WindowScene[]>()
    scenes
      .filter((s) => s.status === '待核验')
      .forEach((s) => {
        const list = map.get(s.archiveId) ?? []
        list.push(s)
        map.set(s.archiveId, list)
      })
    return map
  }, [scenes])

  const openCreate = () => {
    setFormError('')
    setNotice('')
    setEditor({ mode: 'create' })
  }

  const openEdit = (archive: RouteArchive) => {
    setFormError('')
    setNotice('')
    setEditor({ mode: 'edit', archive })
  }

  const handleSubmit = (draft: { routeName: string; stations: string[] }) => {
    if (editor.mode === 'create') {
      const result = addArchive(draft)
      if (result.ok === false) {
        setFormError(result.error)
        return
      }
      setNotice(`线路档案「${draft.routeName.trim()}」已登记`)
      setEditor({ mode: 'closed' })
    } else if (editor.mode === 'edit') {
      const result = editArchive(editor.archive.id, draft)
      if (result.ok === false) {
        setFormError(result.error)
        return
      }
      setNotice(
        result.affectedCount > 0
          ? `档案已改写，${result.affectedCount} 条记录转入待核验，核验通过前该档案锁定`
          : '档案已更新，现有记录区间均有效'
      )
      setEditor({ mode: 'closed' })
    }
  }

  const handleDelete = (archive: RouteArchive) => {
    const result = removeArchive(archive.id)
    if (result.ok === false) {
      setNotice(result.error)
    } else {
      setNotice(`已删除档案「${archive.routeName}」`)
    }
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-wide text-dusk-400">
              <Waypoints className="w-7 h-7" />线路档案
            </h1>
            <p className="mt-1 text-sm text-mist-400">登记起讫站与有序途经站，窗景记录只能选取相邻两站的顺向区间</p>
          </div>
          <button
            onClick={openCreate}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-dusk-400 px-4 py-2 text-sm text-teal-950 transition hover:bg-dusk-300"
          >
            <Plus className="w-4 h-4" />登记线路
          </button>
        </div>

        {notice && (
          <div className="mb-4 rounded-lg border border-dusk-400/30 bg-dusk-400/10 px-4 py-2.5 text-sm text-dusk-200 animate-slide-down">
            {notice}
          </div>
        )}

        {archives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">🗺️</div>
            <p className="text-lg">还没有线路档案</p>
            <p className="mt-1 text-sm">登记一条线路的起讫站后，才能在记录页选取区间</p>
          </div>
        ) : (
          <div className="space-y-4">
            {archives.map((archive) => {
              const pending = pendingByArchive.get(archive.id) ?? []
              const locked = pending.length > 0
              const sceneCount = scenes.filter((s) => s.archiveId === archive.id).length
              return (
                <div
                  key={archive.id}
                  className={`rounded-2xl border p-5 transition-colors ${
                    locked
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-teal-800 bg-teal-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-mist-100">{archive.routeName}</h2>
                        {locked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300">
                            <Lock className="w-3 h-3" />档案锁定
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-mist-500">
                        {archive.stations.length} 站 · {sceneCount} 条窗景记录
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => (locked ? setNotice('该档案有待核验记录，核验通过前不能修改') : openEdit(archive))}
                        disabled={locked}
                        className={`rounded-lg p-2 text-sm transition ${
                          locked
                            ? 'cursor-not-allowed text-mist-600'
                            : 'text-mist-300 hover:bg-teal-800 hover:text-dusk-300'
                        }`}
                        title={locked ? '核验通过前不能修改' : '改写档案'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(archive)}
                        className="rounded-lg p-2 text-mist-300 transition hover:bg-red-900/40 hover:text-red-300"
                        title="删除档案"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 有序站序：起点 → 途经 → 终点 */}
                  <div className="mt-4 flex flex-wrap items-center gap-y-2 text-sm">
                    {archive.stations.map((station, idx) => (
                      <span key={`${station}-${idx}`} className="flex items-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            idx === 0
                              ? 'bg-dusk-400/20 text-dusk-300'
                              : idx === archive.stations.length - 1
                                ? 'bg-teal-700/50 text-mist-100'
                                : 'bg-teal-800/70 text-mist-300'
                          }`}
                        >
                          {station}
                        </span>
                        {idx < archive.stations.length - 1 && (
                          <ArrowRight className="mx-1 w-3.5 h-3.5 text-mist-500" />
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-mist-500">
                    {archive.stations[0]}（起点） · {archive.stations[archive.stations.length - 1]}（终点），其余为途经站
                  </p>

                  {locked && (
                    <div className="mt-4 rounded-xl border border-amber-500/30 bg-teal-950/50 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-300">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {pending.length} 条记录的区间在新站序下失效，待核验（不得移除）
                      </p>
                      <div className="space-y-2">
                        {pending.map((scene) => (
                          <button
                            key={scene.id}
                            onClick={() => setVerifying(scene)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg bg-teal-900/70 px-3 py-2 text-left text-xs transition hover:bg-teal-800"
                          >
                            <span className="text-mist-200">
                              {segmentLabel(scene.fromStation, scene.toStation)}
                            </span>
                            <span className="flex items-center gap-2 text-mist-500">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(scene.timestamp)}
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editor.mode !== 'closed' && (
        <ArchiveEditor
          editor={editor}
          error={formError}
          onCancel={() => setEditor({ mode: 'closed' })}
          onSubmit={handleSubmit}
        />
      )}

      {verifying && (
        <VerifyDialog
          scene={verifying}
          archive={archives.find((a) => a.id === verifying.archiveId)}
          onClose={() => setVerifying(null)}
          onApprove={(segment) => {
            const result = approveScene(verifying.id, segment)
            if (result.ok) {
              setVerifying(null)
              setNotice('核验通过，记录已恢复正常')
            }
            return result
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------ 档案登记/改写 ------------------------------ */

function ArchiveEditor({
  editor,
  error,
  onCancel,
  onSubmit,
}: {
  editor: Extract<EditorState, { mode: 'create' | 'edit' }>
  error: string
  onCancel: () => void
  onSubmit: (draft: { routeName: string; stations: string[] }) => void
}) {
  const initial =
    editor.mode === 'edit'
      ? { routeName: editor.archive.routeName, stations: [...editor.archive.stations] }
      : { ...emptyDraft, stations: [...emptyDraft.stations] }
  const [routeName, setRouteName] = useState(initial.routeName)
  const [stations, setStations] = useState<string[]>(initial.stations)

  const setStation = (idx: number, value: string) =>
    setStations((prev) => prev.map((s, i) => (i === idx ? value : s)))

  const addStation = () => setStations((prev) => [...prev, ''])
  const removeStation = (idx: number) =>
    setStations((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ routeName, stations })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-dusk-400">
            {editor.mode === 'create' ? <Plus className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            {editor.mode === 'create' ? '登记线路档案' : '改写线路档案'}
          </h2>
          <button type="button" onClick={onCancel} className="text-mist-400 hover:text-mist-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {editor.mode === 'edit' && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" />
            <span>改写站序后，引用失效区间的已有记录将转入待核验且不能移除；它们全部核验通过前，本档案不能再次修改。</span>
          </div>
        )}

        <label className="mb-1 block text-xs text-mist-300">线路名</label>
        <input
          className="mb-4 w-full rounded-xl border border-teal-700 bg-teal-950 px-3 py-2 text-sm text-mist-100 outline-none focus:border-dusk-400"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          placeholder="如：12 路"
          autoFocus
        />

        <label className="mb-1 block text-xs text-mist-300">有序途经站（首站为起点，末站为终点）</label>
        <div className="space-y-2">
          {stations.map((station, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className={`w-10 shrink-0 text-right text-[11px] ${
                  idx === 0
                    ? 'text-dusk-300'
                    : idx === stations.length - 1
                      ? 'text-mist-200'
                      : 'text-mist-500'
                }`}
              >
                {idx === 0 ? '起点' : idx === stations.length - 1 ? '终点' : `途经${idx}`}
              </span>
              <input
                className="flex-1 rounded-xl border border-teal-700 bg-teal-950 px-3 py-2 text-sm text-mist-100 outline-none focus:border-dusk-400"
                value={station}
                onChange={(e) => setStation(idx, e.target.value)}
                placeholder={`第 ${idx + 1} 站`}
              />
              <button
                type="button"
                onClick={() => removeStation(idx)}
                disabled={stations.length <= 2}
                className={`p-1.5 ${stations.length <= 2 ? 'cursor-not-allowed text-mist-600' : 'text-mist-400 hover:text-red-300'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStation}
          className="mt-2 flex items-center gap-1 text-xs text-dusk-300 hover:text-dusk-200"
        >
          <Plus className="w-3.5 h-3.5" />在终点前追加途经站
        </button>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-teal-700 py-2.5 text-sm text-mist-300 transition hover:bg-teal-800"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-dusk-400 py-2.5 text-sm font-medium text-teal-950 transition hover:bg-dusk-300"
          >
            {editor.mode === 'create' ? '登记' : '保存改写'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* -------------------------------- 核验弹窗 -------------------------------- */

function VerifyDialog({
  scene,
  archive,
  onClose,
  onApprove,
}: {
  scene: WindowScene
  archive?: RouteArchive
  onClose: () => void
  onApprove: (segment: { from: string; to: string }) => { ok: boolean; error?: string }
}) {
  const segments = useMemo(
    () => (archive ? getAdjacentSegments(archive) : []),
    [archive]
  )
  const suggested = useMemo(
    () => (archive ? suggestSegment(archive, scene.fromStation) : null),
    [archive, scene.fromStation]
  )
  const [selected, setSelected] = useState(
    suggested ? segmentLabel(suggested.from, suggested.to) : ''
  )
  const [error, setError] = useState('')

  if (!archive) return null

  const problem = describeSegmentProblem(archive, scene.fromStation, scene.toStation)

  const handleApprove = () => {
    const match = segments.find((seg) => segmentLabel(seg.from, seg.to) === selected)
    if (!match) {
      setError('请选择一个当前站序下的有效相邻区间')
      return
    }
    const result = onApprove(match)
    if (result.ok === false) setError(result.error ?? '核验失败')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-scale-in rounded-2xl border border-amber-500/40 bg-teal-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-amber-300">
            <ShieldAlert className="w-5 h-5" />区间核验
          </h2>
          <button onClick={onClose} className="text-mist-400 hover:text-mist-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-teal-950/60 px-4 py-3">
            <p className="text-xs text-mist-500">{archive.routeName} · 原记录区间（已失效）</p>
            <p className="mt-1 text-base text-mist-100 line-through decoration-amber-400/60">
              {segmentLabel(scene.fromStation, scene.toStation)}
            </p>
            <p className="mt-1 text-xs text-amber-300">{problem}</p>
          </div>

          {scene.note && (
            <div className="rounded-lg border border-teal-800 px-3 py-2 text-xs text-mist-300">
              {scene.note}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs text-mist-300">改挂到当前站序下的相邻区间后通过核验：</p>
            <div className="flex flex-wrap gap-2">
              {segments.map((seg) => {
                const label = segmentLabel(seg.from, seg.to)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setSelected(label); setError('') }}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      selected === label
                        ? 'bg-dusk-400 text-teal-950'
                        : 'bg-teal-800 text-mist-300 hover:bg-teal-700'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-teal-700 py-2.5 text-sm text-mist-300 transition hover:bg-teal-800"
          >
            稍后核验
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 rounded-xl bg-dusk-400 py-2.5 text-sm font-medium text-teal-950 transition hover:bg-dusk-300"
          >
            核验通过
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-mist-500">
          全部待核验记录通过后，档案自动解除锁定
        </p>
      </div>
    </div>
  )
}

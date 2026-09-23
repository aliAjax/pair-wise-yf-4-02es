import { useState, useEffect } from 'react'
import { Bus, MapPin, Armchair, Clock, CloudSun, Signpost, TreePine, Users, FileText, Send, Waypoints, AlertTriangle, ArrowRight, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSceneStore } from '@/store/useSceneStore'
import { getWeatherIcon, getTreeIcon, getPedestrianIcon, formatTimestamp } from '@/utils/sceneHelpers'
import { validateSegment, SEGMENT_ERROR_MESSAGES, segmentLabel } from '@/utils/segmentRules'
import type { SceneFormData, Weather, TreeDensity, PedestrianStatus, SeatDirection } from '@/types'

const WEATHERS: Weather[] = ['晴', '多云', '阴', '小雨', '大雨', '雪', '雾']
const TREES: TreeDensity[] = ['稀疏', '适中', '茂密']
const PEDESTRIANS: PedestrianStatus[] = ['稀少', '零星', '密集']

const initialForm: SceneFormData = {
  archiveId: '',
  fromStation: '',
  toStation: '',
  seatDirection: '左',
  weather: '晴',
  signText: '',
  treeDensity: '适中',
  pedestrianStatus: '稀少',
  note: '',
}

const selectClass =
  'w-full appearance-none rounded-xl border border-teal-700 bg-teal-950 px-3 py-2 text-sm text-mist-100 outline-none focus:border-dusk-400'

export default function RecordPage() {
  const saveScene = useSceneStore((s) => s.saveScene)
  const loadAll = useSceneStore((s) => s.loadAll)
  const archives = useSceneStore((s) => s.archives)
  const [form, setForm] = useState<SceneFormData>(initialForm)
  const [now, setNow] = useState(new Date())
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const selectedArchive = archives.find((a) => a.id === form.archiveId)

  const update = <K extends keyof SceneFormData>(key: K, val: SceneFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  // 线路档案切换后清空区间选择，避免带入别的线路站点
  const handleArchiveChange = (archiveId: string) => {
    setError('')
    setForm((prev) => ({ ...prev, archiveId, fromStation: '', toStation: '' }))
  }

  const handleStationChange = (key: 'fromStation' | 'toStation', value: string) => {
    setError('')
    update(key, value)
  }

  // 选择区间时的即时提示（不拦截输入）
  const liveError = selectedArchive
    ? validateSegment(selectedArchive, form.fromStation, form.toStation)
    : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = saveScene(form)
    if (result.ok === false) {
      // 方向/相邻校验失败：整条退回，表单与已有记录均不变，仅提示
      setError(result.error)
      return
    }
    setError('')
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setForm(initialForm)
    }, 1500)
  }

  if (archives.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-teal-950 px-6 text-center">
        <Waypoints className="mb-6 h-16 w-16 text-dusk-400/40" />
        <p className="mb-2 font-serif text-lg text-mist-100">先登记一条线路档案</p>
        <p className="mb-6 text-sm text-mist-400">窗景区间必须来自档案中相邻两站，尚未登记任何线路</p>
        <Link
          to="/archives"
          className="rounded-full bg-dusk-400 px-5 py-2.5 text-sm text-teal-950 transition hover:bg-dusk-300"
        >
          前往档案页登记
        </Link>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-teal-950 p-4 pb-24">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce flex flex-col items-center gap-2 opacity-0" style={{ animation: 'fadeInUp 1.5s ease forwards' }}>
            <Bus className="w-16 h-16 text-dusk-400" />
            <span className="text-mist-100 font-serif text-lg">记录已保存</span>
          </div>
          <style>{`@keyframes fadeInUp { 0% { opacity:0; transform:translateY(20px) } 40% { opacity:1; transform:translateY(0) } 100% { opacity:0; transform:translateY(-40px) } }`}</style>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Bus className="w-6 h-6 text-dusk-400" />
          <h1 className="text-mist-100 font-serif text-2xl">窗景记录</h1>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-200 animate-slide-down">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
            <MapPin className="w-4 h-4" />路线信息
          </h2>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Waypoints className="w-3 h-3" />线路档案</label>
            <div className="relative">
              <select
                className={selectClass}
                value={form.archiveId}
                onChange={(e) => handleArchiveChange(e.target.value)}
                required
              >
                <option value="" disabled>选择已登记的线路</option>
                {archives.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.routeName}（{a.stations[0]} → {a.stations[a.stations.length - 1]}，{a.stations.length} 站）
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
            </div>
          </div>

          {selectedArchive && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />发站</label>
                  <div className="relative">
                    <select
                      className={selectClass}
                      value={form.fromStation}
                      onChange={(e) => handleStationChange('fromStation', e.target.value)}
                      required
                    >
                      <option value="" disabled>选择发站</option>
                      {selectedArchive.stations.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
                  </div>
                </div>
                <div>
                  <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />到站</label>
                  <div className="relative">
                    <select
                      className={selectClass}
                      value={form.toStation}
                      onChange={(e) => handleStationChange('toStation', e.target.value)}
                      required
                    >
                      <option value="" disabled>选择到站</option>
                      {selectedArchive.stations.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
                  </div>
                </div>
              </div>

              {/* 区间合法性即时提示 */}
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs min-h-[2rem]"
                style={{ display: form.fromStation && form.toStation ? 'flex' : 'none' }}>
                {liveError === null ? (
                  <span className="flex items-center gap-1.5 text-green-400">
                    <ArrowRight className="w-3.5 h-3.5" />
                    区间有效：{segmentLabel(form.fromStation, form.toStation)}（与档案站序同向相邻）
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {SEGMENT_ERROR_MESSAGES[liveError]}
                  </span>
                )}
              </div>
            </>
          )}

          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Armchair className="w-3 h-3" />座位方向</label>
            <div className="flex gap-2">
              {(['左', '右'] as SeatDirection[]).map((d) => (
                <button key={d} type="button" onClick={() => update('seatDirection', d)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${form.seatDirection === d ? 'bg-dusk-400/20 text-dusk-400 border border-dusk-400' : 'bg-teal-850 text-mist-300 border border-transparent'}`}>
                  {d}侧
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
            <CloudSun className="w-4 h-4" />窗景信息
          </h2>
          <div>
            <label className="text-mist-300 text-xs mb-1 block">天气</label>
            <div className="grid grid-cols-4 gap-2">
              {WEATHERS.map((w) => (
                <button key={w} type="button" onClick={() => update('weather', w)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition ${form.weather === w ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                  {getWeatherIcon(w)}{w}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Signpost className="w-3 h-3" />招牌文字</label>
            <input className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400" value={form.signText} onChange={(e) => update('signText', e.target.value)} />
          </div>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><TreePine className="w-3 h-3" />树木密度</label>
            <div className="grid grid-cols-3 gap-2">
              {TREES.map((t) => (
                <button key={t} type="button" onClick={() => update('treeDensity', t)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition ${form.treeDensity === t ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                  {getTreeIcon(t)}{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Users className="w-3 h-3" />行人状态</label>
            <div className="grid grid-cols-3 gap-2">
              {PEDESTRIANS.map((p) => (
                <button key={p} type="button" onClick={() => update('pedestrianStatus', p)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition ${form.pedestrianStatus === p ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                  {getPedestrianIcon(p)}{p}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
            <FileText className="w-4 h-4" />观察笔记
          </h2>
          <textarea className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400 resize-none h-24" value={form.note} onChange={(e) => update('note', e.target.value)} />
        </section>

        <div className="flex items-center gap-2 text-mist-400 text-xs">
          <Clock className="w-3 h-3" />
          <span>{formatTimestamp(now.toISOString())}</span>
        </div>

        <button type="submit"
          className="w-full py-3 rounded-xl bg-dusk-400 text-teal-950 font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition">
          <Send className="w-4 h-4" />保存记录
        </button>
      </form>
    </div>
  )
}

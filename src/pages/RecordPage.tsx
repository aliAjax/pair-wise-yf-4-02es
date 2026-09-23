import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bus, MapPin, Armchair, Clock, CloudSun, Signpost, TreePine, Users, FileText, Send, Route as RouteIcon, ShieldAlert, ArrowRight } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { getWeatherIcon, getTreeIcon, getPedestrianIcon, formatTimestamp } from '@/utils/sceneHelpers'
import { validateSegment } from '@/utils/segmentValidation'
import type { SceneFormData, Weather, TreeDensity, PedestrianStatus, SeatDirection } from '@/types'

const WEATHERS: Weather[] = ['晴', '多云', '阴', '小雨', '大雨', '雪', '雾']
const TREES: TreeDensity[] = ['稀疏', '适中', '茂密']
const PEDESTRIANS: PedestrianStatus[] = ['稀少', '零星', '密集']

const initialForm: SceneFormData = {
  routeArchiveId: '',
  fromStationId: '',
  toStationId: '',
  seatDirection: '左',
  weather: '晴',
  signText: '',
  treeDensity: '适中',
  pedestrianStatus: '稀少',
  note: '',
}

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

  const selectedArchive = useMemo(
    () => archives.find((a) => a.id === form.routeArchiveId),
    [archives, form.routeArchiveId]
  )

  const update = <K extends keyof SceneFormData>(key: K, val: SceneFormData[K]) => {
    setError('')
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const changeArchive = (archiveId: string) => {
    setError('')
    // 切换线路后重新选站，避免串线
    setForm((prev) => ({ ...prev, routeArchiveId: archiveId, fromStationId: '', toStationId: '' }))
  }

  // 选站阶段给出实时提示，但不改动表单；最终以提交时校验为准
  const liveCheck = useMemo(() => {
    if (!selectedArchive || !form.fromStationId || !form.toStationId) return null
    return validateSegment(selectedArchive, form.fromStationId, form.toStationId)
  }, [selectedArchive, form.fromStationId, form.toStationId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 方向与档案不符、或两站不相邻时整条退回：表单与已有记录均保持不变
    const result = saveScene(form)
    if (!result.ok) {
      setError(result.message ?? '区间不符合线路档案')
      return
    }
    setError('')
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setForm(initialForm)
    }, 1500)
  }

  const selectClass = 'w-full appearance-none rounded-xl bg-teal-850 px-3 py-2 pr-8 text-sm text-mist-100 outline-none focus:ring-1 focus:ring-dusk-400 disabled:opacity-50'

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

        {archives.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-dusk-400/30 bg-dusk-400/10 px-4 py-3 text-sm text-dusk-300">
            <RouteIcon className="mt-0.5 w-4 h-4 shrink-0" />
            <span>
              还没有线路档案，请先
              <Link to="/archives" className="mx-1 underline underline-offset-2 hover:text-dusk-200">登记线路档案</Link>
              （起讫站与有序途经站），再记录窗景。
            </span>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
            <MapPin className="w-4 h-4" />路线信息
          </h2>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><RouteIcon className="w-3 h-3" />线路档案</label>
            <div className="relative">
              <select
                className={selectClass}
                value={form.routeArchiveId}
                onChange={(e) => changeArchive(e.target.value)}
                required
              >
                <option value="">请选择线路档案</option>
                {archives.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}（{a.stations.length} 站）</option>
                ))}
              </select>
              <ArrowRight className="pointer-events-none absolute right-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 rotate-90 text-mist-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />区间起站</label>
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.fromStationId}
                  onChange={(e) => update('fromStationId', e.target.value)}
                  disabled={!selectedArchive}
                  required
                >
                  <option value="">选择起站</option>
                  {selectedArchive?.stations.map((s, i) => (
                    <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>
                  ))}
                </select>
                <ArrowRight className="pointer-events-none absolute right-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 rotate-90 text-mist-400" />
              </div>
            </div>
            <div>
              <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />区间讫站</label>
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.toStationId}
                  onChange={(e) => update('toStationId', e.target.value)}
                  disabled={!selectedArchive}
                  required
                >
                  <option value="">选择讫站</option>
                  {selectedArchive?.stations.map((s, i) => (
                    <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>
                  ))}
                </select>
                <ArrowRight className="pointer-events-none absolute right-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 rotate-90 text-mist-400" />
              </div>
            </div>
          </div>
          {liveCheck && (
            <p className={`flex items-center gap-1.5 text-xs ${liveCheck.valid ? 'text-emerald-400' : 'text-amber-400'}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {liveCheck.valid
                ? '区间沿档案站序且两站相邻，可以记录'
                : liveCheck.message}
            </p>
          )}
          {error && (
            <p className="flex items-center gap-1.5 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-300">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              {error}（表单内容未改动）
            </p>
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

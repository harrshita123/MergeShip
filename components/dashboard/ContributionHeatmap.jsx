'use client'

import { useEffect, useMemo, useState } from 'react'
import { getContributionData } from '@/app/(contributor)/dashboard/actions'

const LEVEL_COLORS = [
  'rgba(255,255,255,0.03)',     // 0
  'rgba(124,58,237,0.25)',       // 1
  'rgba(124,58,237,0.55)',       // 2
  'rgba(167,139,250,0.85)',      // 3
  'rgba(216,180,254,1)',         // 4
]

export default function ContributionHeatmap({ handle, forceSync = false }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const r = await getContributionData(handle, forceSync)
        if (!alive) return
        setData(r.data)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [handle, forceSync])

  const weeks = useMemo(() => toWeeks(data?.contributions || []), [data])
  const total = data?.total || 0
  const months = useMemo(() => monthLabels(data?.contributions || []), [data])

  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
            Contribution Activity
          </div>
          <h2
            className="text-xl md:text-2xl font-bold"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            <span className="gradient-text">{total.toLocaleString()}</span> contributions in the last year
          </h2>
        </div>
        <Legend />
      </div>

      <div className="relative overflow-x-auto">
        {loading && !data ? (
          <div className="h-[160px] animate-pulse bg-white/5 rounded-lg" />
        ) : (
          <div className="relative inline-block">
            <div className="flex gap-[10px] ml-[28px] mb-1">
              {months.map((m, i) => (
                <span
                  key={i}
                  className="text-[10px] text-[#606080] font-semibold"
                  style={{ width: 52 }}
                >
                  {m || ''}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {/* Day labels column */}
              <div className="flex flex-col gap-[3px] mr-1 text-[9px] text-[#606080] font-semibold pr-1">
                {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                  <span key={i} style={{ height: 12, lineHeight: '12px' }}>{d}</span>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }).map((_, di) => {
                    const day = week[di]
                    if (!day) return <span key={di} style={{ width: 12, height: 12 }} />
                    return (
                      <button
                        key={di}
                        type="button"
                        onMouseEnter={() => setHover(day)}
                        onMouseLeave={() => setHover(null)}
                        className="rounded-sm transition-transform hover:scale-[1.4]"
                        style={{
                          width: 12,
                          height: 12,
                          background: LEVEL_COLORS[Math.min(4, day.level || 0)],
                          outline: '1px solid rgba(255,255,255,0.02)',
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {hover && (
              <div className="absolute top-0 right-0 translate-y-[-120%] bg-[#15111A] border border-white/10 px-3 py-1.5 rounded-lg text-[11px] shadow-xl">
                <div className="text-[#D8B4FE] font-bold">{hover.count} contribution{hover.count === 1 ? '' : 's'}</div>
                <div className="text-[#8B7E9F]">{hover.date}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-[#8B7E9F]">
      <span>Less</span>
      {LEVEL_COLORS.map((c, i) => (
        <span
          key={i}
          className="rounded-sm"
          style={{ width: 12, height: 12, background: c, outline: '1px solid rgba(255,255,255,0.03)' }}
        />
      ))}
      <span>More</span>
    </div>
  )
}

/* Turn a 365-day array into columns of weeks aligned by day-of-week */
function toWeeks(contribs) {
  if (!contribs?.length) return []
  const weeks = []
  let current = []
  const first = new Date(contribs[0].date)
  const firstDow = (first.getUTCDay() + 6) % 7 // Mon=0
  // pad the first week so Mon aligns
  for (let i = 0; i < firstDow; i++) current.push(null)
  contribs.forEach((c) => {
    const d = new Date(c.date)
    const dow = (d.getUTCDay() + 6) % 7
    current[dow] = c
    if (dow === 6) {
      while (current.length < 7) current.push(null)
      weeks.push(current)
      current = []
    }
  })
  if (current.length) {
    while (current.length < 7) current.push(null)
    weeks.push(current)
  }
  return weeks
}

/* Build month labels, one per ~4-week column */
function monthLabels(contribs) {
  if (!contribs?.length) return []
  const weeks = toWeeks(contribs)
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  let lastMonth = -1
  return weeks.map((week) => {
    const firstDay = week.find((d) => d)
    if (!firstDay) return ''
    const m = new Date(firstDay.date).getUTCMonth()
    if (m !== lastMonth) {
      lastMonth = m
      return names[m]
    }
    return ''
  })
}

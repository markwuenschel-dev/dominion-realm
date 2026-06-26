'use client'

import { useMemo }             from 'react'
import { SectionCard }         from '@/components/layout/SectionCard'
import { Slider, Label }       from '@/components/ui/index'
import { useCalculatorStore }  from '@/store/calculatorStore'
import { useCalculator }       from '@/hooks/useCalculator'
import { computeRegenMultiplier } from '@/lib/formulas'
import { round }               from '@/lib/utils'
import { DEFAULT_REGEN_CURVE_PARAMS } from '@/lib/constants'

const W = 640
const H = 220
const PAD = { top: 16, right: 16, bottom: 36, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top  - PAD.bottom

function qToX(q: number) { return PAD.left + q * PLOT_W }
function mToY(m: number) { return PAD.top  + (1 - m) * PLOT_H }

export function RegenCurveViz() {
  const regenCurveParams   = useCalculatorStore(s => s.regenCurveParams)
  const currentResources   = useCalculatorStore(s => s.currentResources)
  const setRegenCurveParam = useCalculatorStore(s => s.setRegenCurveParam)
  const resetRegenCurveParams = useCalculatorStore(s => s.resetRegenCurveParams)
  const { curveSamples, ratios } = useCalculator()

  const { q_s, gamma, p } = regenCurveParams

  // Build SVG path strings
  const { failurePath, safePath } = useMemo(() => {
    const failurePts = curveSamples.filter(s => s.zone === 'failure' || (s.q <= q_s + 0.002))
    const safePts    = curveSamples.filter(s => s.zone === 'safe'    || (s.q >= q_s - 0.002))

    const toPathData = (pts: typeof curveSamples) => {
      if (pts.length === 0) return ''
      const [first, ...rest] = pts
      if (!first) return ''
      const start = `M ${qToX(first.q).toFixed(1)} ${mToY(first.multiplier).toFixed(1)}`
      const lines = rest.map(pt => `L ${qToX(pt.q).toFixed(1)} ${mToY(pt.multiplier).toFixed(1)}`).join(' ')
      return `${start} ${lines}`
    }

    return {
      failurePath: toPathData(failurePts),
      safePath:    toPathData(safePts),
    }
  }, [curveSamples, q_s])

  // Grid lines
  const gridQ = [0.25, 0.50, 0.75]
  const gridM = [0.25, 0.50, 0.75, 1.00]

  // Active dot for a given resource
  function Dot({ q, color }: { q: number; color: string }) {
    const m  = computeRegenMultiplier(q, regenCurveParams)
    const cx = qToX(q)
    const cy = mToY(m)
    return (
      <g>
        <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top + PLOT_H}
              stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
        <circle cx={cx} cy={cy} r={5} fill={color} stroke="#09090b" strokeWidth={2} />
      </g>
    )
  }

  return (
    <SectionCard
      section="§4"
      title="Regeneration Curve"
      subtitle="Safe-low asymptotic model — peak at q = q_s, suppressed below (failure zone)"
    >
      {/* SVG curve */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxWidth: W, minWidth: 320 }}
          aria-label="Regeneration curve: multiplier vs resource ratio q"
        >
          {/* Grid lines */}
          {gridQ.map(q => (
            <line key={q}
              x1={qToX(q)} y1={PAD.top}
              x2={qToX(q)} y2={PAD.top + PLOT_H}
              stroke="#1e1e28" strokeWidth={1} />
          ))}
          {gridM.map(m => (
            <g key={m}>
              <line
                x1={PAD.left} y1={mToY(m)}
                x2={PAD.left + PLOT_W} y2={mToY(m)}
                stroke="#1e1e28" strokeWidth={1} />
              <text
                x={PAD.left - 6} y={mToY(m) + 4}
                textAnchor="end" fontSize={9} fill="#52525b"
                fontFamily="JetBrains Mono, monospace">
                {(m * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* X axis labels */}
          {[0, 0.10, 0.25, 0.50, 0.75, 1.00].map(q => (
            <text key={q}
              x={qToX(q)} y={PAD.top + PLOT_H + 16}
              textAnchor="middle" fontSize={9} fill="#52525b"
              fontFamily="JetBrains Mono, monospace">
              {(q * 100).toFixed(0)}%
            </text>
          ))}

          {/* Axis labels */}
          <text x={PAD.left + PLOT_W / 2} y={H - 2}
            textAnchor="middle" fontSize={9} fill="#71717a">
            Current Resource  q = R(t) / R_max
          </text>
          <text
            x={12} y={PAD.top + PLOT_H / 2}
            textAnchor="middle" fontSize={9} fill="#71717a"
            transform={`rotate(-90, 12, ${PAD.top + PLOT_H / 2})`}>
            Multiplier
          </text>

          {/* q_s vertical marker */}
          <line
            x1={qToX(q_s)} y1={PAD.top}
            x2={qToX(q_s)} y2={PAD.top + PLOT_H}
            stroke="#c89b3c" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
          <text
            x={qToX(q_s) + 3} y={PAD.top + 10}
            fontSize={9} fill="#c89b3c" fontFamily="JetBrains Mono, monospace">
            q_s = {(q_s * 100).toFixed(0)}%
          </text>

          {/* Failure zone fill */}
          <rect
            x={PAD.left} y={PAD.top}
            width={qToX(q_s) - PAD.left}
            height={PLOT_H}
            fill="#7f1d1d" opacity={0.08} />

          {/* Curve paths */}
          <path d={failurePath} fill="none" stroke="#ef4444" strokeWidth={2.5} opacity={0.9} />
          <path d={safePath}    fill="none" stroke="#10b981" strokeWidth={2.5} opacity={0.9} />

          {/* Resource dots */}
          <Dot q={ratios.HP}      color="#ef4444" />
          <Dot q={ratios.Mana}    color="#3b82f6" />
          <Dot q={ratios.Stamina} color="#10b981" />
          <Dot q={ratios.Reserve} color="#8b5cf6" />

          {/* Legend */}
          {[
            { label: 'HP',      color: '#ef4444' },
            { label: 'Mana',    color: '#3b82f6' },
            { label: 'Stamina', color: '#10b981' },
            { label: 'Reserve', color: '#8b5cf6' },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${PAD.left + 8 + i * 78}, ${PAD.top + 10})`}>
              <circle cx={0} cy={0} r={4} fill={item.color} />
              <text x={7} y={4} fontSize={9} fill={item.color}
                fontFamily="JetBrains Mono, monospace">{item.label}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Curve parameter controls */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CurveParamSlider
          label="q_s  (safe-low threshold)"
          value={q_s}
          min={0.05} max={0.30} step={0.01}
          format={v => `${(v * 100).toFixed(0)}%`}
          hint="Default 10% — peak regen at this q"
          onChange={v => setRegenCurveParam('q_s', v)}
          isDefault={q_s === DEFAULT_REGEN_CURVE_PARAMS.q_s}
        />
        <CurveParamSlider
          label="γ  (safe-zone curvature)"
          value={gamma}
          min={0.10} max={1.50} step={0.05}
          format={v => v.toFixed(2)}
          hint="Default 0.45 — higher = steeper fall-off"
          onChange={v => setRegenCurveParam('gamma', v)}
          isDefault={gamma === DEFAULT_REGEN_CURVE_PARAMS.gamma}
        />
        <CurveParamSlider
          label="p  (failure suppression)"
          value={p}
          min={1} max={4} step={0.5}
          format={v => v.toFixed(1)}
          hint="Default 2 — higher = sharper crash below q_s"
          onChange={v => setRegenCurveParam('p', v)}
          isDefault={p === DEFAULT_REGEN_CURVE_PARAMS.p}
        />
      </div>

      <button
        onClick={resetRegenCurveParams}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Reset to locked defaults
      </button>
    </SectionCard>
  )
}

function CurveParamSlider({
  label, value, min, max, step, format, hint, onChange, isDefault,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  hint?: string
  onChange: (v: number) => void
  isDefault: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="stat-value text-xs text-muted-foreground">{label}</Label>
        <span className={`stat-value text-sm font-semibold ${isDefault ? 'text-realm-gold-dim' : 'text-realm-gold'}`}>
          {format(value)}
        </span>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        aria-label={label}
      />
      {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
    </div>
  )
}

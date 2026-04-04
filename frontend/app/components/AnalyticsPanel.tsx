'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { useEffect, useState } from 'react'

interface PricePoint {
  id: number
  symbol: string
  price: number
  change_24h: number
  timestamp: string
}

interface AnalyticsPanelProps {
  apiUrl: string
  symbols?: string[]
}

interface CorrelationData {
  symbols: string[]
  matrix: Record<string, Record<string, number | null>>
}

const COLORS: Record<string, string> = {
  BTC: '#f7931a',
  ETH: '#627eea',
  GOLD: '#ffd700',
  OIL: '#8b4513',
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function correlationColor(v: number | null): string {
  if (v == null) return '#21262d'
  if (v >= 0.7) return 'rgba(52, 211, 153, 0.55)'   // strong positive — emerald
  if (v >= 0.3) return 'rgba(52, 211, 153, 0.25)'   // moderate positive
  if (v > -0.3) return 'rgba(110, 118, 129, 0.20)'  // near-zero — grey
  if (v > -0.7) return 'rgba(248, 113, 113, 0.25)'  // moderate negative
  return 'rgba(248, 113, 113, 0.55)'                 // strong negative — red
}

function CorrelationMatrix({ correlations }: { correlations: CorrelationData }) {
  const { symbols, matrix } = correlations
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Cross-Asset Correlation (Pearson, recent 60 data points)</p>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-gray-500 font-normal pb-1 pr-2 text-right w-12" />
              {symbols.map(s => (
                <th key={s} className="text-gray-400 font-semibold pb-1 px-1 text-center min-w-[52px]">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map(row => (
              <tr key={row}>
                <td className="text-gray-400 font-semibold pr-2 py-0.5 text-right">{row}</td>
                {symbols.map(col => {
                  const v = matrix[row]?.[col]
                  return (
                    <td
                      key={col}
                      className="text-center py-0.5 px-1 rounded font-mono"
                      style={{ backgroundColor: correlationColor(v) }}
                      title={v != null ? `${row} / ${col}: ${v.toFixed(3)}` : 'insufficient data'}
                    >
                      <span className={row === col ? 'text-gray-500' : 'text-gray-200'}>
                        {v != null ? v.toFixed(2) : '—'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-gray-600 mt-2">
          Green = positive correlation · Red = negative · Grey = near-zero
        </p>
      </div>
    </div>
  )
}

export default function AnalyticsPanel({ apiUrl, symbols = ['BTC', 'ETH', 'GOLD', 'OIL'] }: AnalyticsPanelProps) {
  const [priceHistory, setPriceHistory] = useState<Record<string, PricePoint[]>>({})
  const [activeSymbol, setActiveSymbol] = useState('BTC')
  const [correlations, setCorrelations] = useState<CorrelationData | null>(null)

  useEffect(() => {
    const loadHistory = async (symbol: string) => {
      try {
        const res = await fetch(`${apiUrl}/api/history/${symbol}?limit=50`)
        if (res.ok) {
          const data = await res.json()
          setPriceHistory(prev => ({ ...prev, [symbol]: data.reverse() }))
        }
      } catch {}
    }
    symbols.forEach(loadHistory)
    const interval = setInterval(() => symbols.forEach(loadHistory), 30000)
    return () => clearInterval(interval)
  }, [apiUrl, symbols])

  useEffect(() => {
    const loadCorrelation = async () => {
      try {
        const symsParam = symbols.join(',')
        const res = await fetch(`${apiUrl}/api/correlation?symbols=${symsParam}&limit=60`)
        if (res.ok) setCorrelations(await res.json())
      } catch {}
    }
    loadCorrelation()
    const interval = setInterval(loadCorrelation, 60000)
    return () => clearInterval(interval)
  }, [apiUrl, symbols])

  const chartData = (priceHistory[activeSymbol] || []).map(p => ({
    time: formatTimestamp(p.timestamp),
    price: p.price,
    change: p.change_24h,
  }))

  const changeBarData = symbols.map(sym => {
    const latest = priceHistory[sym]?.[priceHistory[sym].length - 1]
    return {
      symbol: sym,
      change: latest?.change_24h ?? 0,
    }
  })

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
      <h2 className="font-bold text-white mb-4 flex items-center gap-2">
        <span>📊</span> Analytics
      </h2>

      {/* Symbol selector */}
      <div className="flex gap-2 mb-4">
        {symbols.map(sym => (
          <button
            key={sym}
            onClick={() => setActiveSymbol(sym)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              activeSymbol === sym
                ? 'border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff]'
                : 'border-[#30363d] text-gray-400 hover:border-gray-400'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Price chart */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-2">Price History — {activeSymbol}</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="time" tick={{ fill: '#6e7681', fontSize: 10 }} />
              <YAxis
                tick={{ fill: '#6e7681', fontSize: 10 }}
                tickFormatter={v => `$${v.toLocaleString()}`}
                width={70}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: 8 }}
                labelStyle={{ color: '#e6edf3' }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, 'Price']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={COLORS[activeSymbol] || '#58a6ff'}
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
            Collecting price data…
          </div>
        )}
      </div>

      {/* 24h change bar chart */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-2">24h Change (%)</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={changeBarData} barSize={24}>
            <XAxis dataKey="symbol" tick={{ fill: '#6e7681', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} unit="%" />
            <Tooltip
              contentStyle={{ backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: 8 }}
              formatter={(v: number) => [`${v.toFixed(2)}%`, '24h Change']}
            />
            <Bar
              dataKey="change"
              fill="#58a6ff"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cross-asset correlation */}
      {correlations && correlations.symbols.length >= 2 && (
        <CorrelationMatrix correlations={correlations} />
      )}
    </div>
  )
}


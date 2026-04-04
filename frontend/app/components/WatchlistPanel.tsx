'use client'

import { useEffect, useState, useCallback } from 'react'
import SignalBadge from './SignalBadge'

interface Consensus {
  asset: string
  final_signal: string
  confidence: number
  agreement_level: string
}

interface Asset {
  symbol: string
  name: string
  price: number
  change_24h?: number
  asset_type: string
}

interface Preferences {
  preferred_assets: string[]
  notify_email: boolean
  email_address: string | null
  notifications_enabled: boolean
}

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('aip_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

function hasToken(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('aip_token')
}

export default function WatchlistPanel({
  apiUrl,
  assets,
  consensus,
}: {
  apiUrl: string
  assets: Asset[]
  consensus: Consensus[]
}) {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAuth = hasToken()

  const loadPrefs = useCallback(async () => {
    if (!isAuth) return
    try {
      const res = await fetch(`${apiUrl}/api/preferences`, { headers: authHeaders() })
      if (res.ok) setPrefs(await res.json())
      else if (res.status === 401) setPrefs(null)
    } catch {}
  }, [apiUrl, isAuth])

  useEffect(() => {
    loadPrefs()
  }, [loadPrefs])

  const toggleAsset = (symbol: string) => {
    if (!prefs) return
    const current = prefs.preferred_assets || []
    const next = current.includes(symbol)
      ? current.filter(s => s !== symbol)
      : [...current, symbol]
    setPrefs({ ...prefs, preferred_assets: next })
    setSaved(false)
  }

  const savePrefs = useCallback(async () => {
    if (!prefs) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/preferences`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(prefs),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setError('Failed to save preferences')
      }
    } catch {
      setError('Connection error')
    }
    setSaving(false)
  }, [apiUrl, prefs])

  // Show only watchlisted assets when populated, otherwise all assets
  const watchlisted = prefs?.preferred_assets ?? []
  const displayAssets = watchlisted.length > 0
    ? assets.filter(a => watchlisted.includes(a.symbol))
    : assets

  if (!isAuth) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
        <h2 className="font-bold text-white mb-2 flex items-center gap-2">
          <span>⭐</span> Watchlist
        </h2>
        <p className="text-xs text-gray-500">
          <a href="/login" className="text-[#58a6ff] hover:underline">Sign in</a> to save your watchlist and preferences.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white flex items-center gap-2">
          <span>⭐</span> Watchlist
        </h2>
        {prefs && (
          <button
            onClick={savePrefs}
            disabled={saving}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#58a6ff]/10 border border-[#58a6ff]/30 text-[#58a6ff] hover:bg-[#58a6ff]/20 transition-colors disabled:opacity-50"
          >
            {saving ? '⟳ Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      {/* Asset toggle grid */}
      {prefs && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Toggle assets to track:</p>
          <div className="flex flex-wrap gap-2">
            {assets.map(a => {
              const active = watchlisted.includes(a.symbol)
              return (
                <button
                  key={a.symbol}
                  onClick={() => toggleAsset(a.symbol)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    active
                      ? 'border-[#58a6ff] bg-[#58a6ff]/15 text-[#58a6ff]'
                      : 'border-[#30363d] text-gray-500 hover:border-gray-400 hover:text-gray-300'
                  }`}
                >
                  {active ? '★' : '☆'} {a.symbol}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Watched asset rows */}
      {displayAssets.length === 0 ? (
        <p className="text-xs text-gray-600 italic">
          Select assets above to add them to your watchlist.
        </p>
      ) : (
        <div className="space-y-2">
          {displayAssets.map(asset => {
            const cons = consensus.find(c => c.asset === asset.symbol)
            const chg = asset.change_24h ?? 0
            return (
              <div
                key={asset.symbol}
                className="flex items-center justify-between py-2 border-b border-[#21262d] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-sm font-semibold text-white">{asset.symbol}</span>
                    <span className="text-xs text-gray-500 ml-1.5">{asset.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-white">
                    ${asset.price >= 1000
                      ? asset.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : asset.price.toFixed(2)}
                  </span>
                  <span className={`text-xs font-mono ${chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                  </span>
                  {cons && <SignalBadge signal={cons.final_signal} size="sm" />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Notification preference */}
      {prefs && (
        <div className="mt-4 pt-3 border-t border-[#21262d]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.notifications_enabled}
              onChange={e => setPrefs({ ...prefs, notifications_enabled: e.target.checked })}
              className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff]"
            />
            <span className="text-xs text-gray-400">Alert notifications enabled</span>
          </label>
        </div>
      )}
    </div>
  )
}

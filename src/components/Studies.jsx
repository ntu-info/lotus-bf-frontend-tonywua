import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'

function classNames (...xs) { return xs.filter(Boolean).join(' ') }

function escapeRegExp (s) { return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
// tokens to ignore (query operators / UI controls)
const HIGHLIGHT_IGNORE = new Set(['and', 'or', 'not', 'reset', '(', ')'])
function highlightText (text, query) {
  if (!text) return ''
  if (!query) return text
  try {
    const q = String(query).trim()
    if (!q) return text
    const parts = q.split(/\s+/).filter(Boolean).map(escapeRegExp).filter(p => !HIGHLIGHT_IGNORE.has(p.toLowerCase()))
    if (!parts.length) return text
    const re = new RegExp(`(${parts.join('|')})`, 'ig')
    const nodes = []
    let lastIndex = 0
    let m
    while ((m = re.exec(text)) !== null) {
      const idx = m.index
      if (idx > lastIndex) nodes.push(text.slice(lastIndex, idx))
      nodes.push(<span key={idx + '-' + m[0]} className='search-term'>{m[0]}</span>)
      lastIndex = idx + m[0].length
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
    return nodes.length ? nodes : text
  } catch (e) {
    return text
  }
}

export function Studies ({ query }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => { setPage(1) }, [query])

  useEffect(() => {
    if (!query) return
    let alive = true
    const ac = new AbortController()
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const url = `${API_BASE}/query/${encodeURIComponent(query)}/studies`
        const res = await fetch(url, { signal: ac.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!alive) return
        const list = Array.isArray(data?.results) ? data.results : []
        setRows(list)
      } catch (e) {
        if (!alive) return
        setErr(`Unable to fetch studies: ${e?.message || e}`)
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false; ac.abort() }
  }, [query])

  const changeSort = (key) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const A = a?.[sortKey]
      const B = b?.[sortKey]
      // Numeric comparison for year; string comparison for other fields
      if (sortKey === 'year') return (Number(A || 0) - Number(B || 0)) * dir
      return String(A || '').localeCompare(String(B || ''), 'en') * dir
    })
    return arr
  }, [rows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className='flex flex-col rounded-2xl border'>
      <div className='flex items-center justify-between p-3'>
        <div className='card__title'>Studies</div>
        <div className='text-sm text-gray-500'>
           {/* {query ? `Query: ${query}` : 'Query: (empty)'} */}
        </div>
      </div>


      {query && loading && (
        <div className='grid gap-3 p-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-10 animate-pulse rounded-lg bg-gray-100' />
          ))}
        </div>
      )}

      {query && err && (
        <div className='mx-3 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {err}
        </div>
      )}

      {query && !loading && !err && (
        <div className='overflow-auto'>
          <table className='min-w-full text-sm'>
            <thead className='sticky top-0 bg-gray-50 text-left'>
              <tr>
                {[
                  { key: 'year', label: 'Year' },
                  { key: 'journal', label: 'Journal' },
                  { key: 'title', label: 'Title' },
                  { key: 'authors', label: 'Authors' }
                ].map(({ key, label }) => (
                  <th key={key} className='cursor-pointer px-3 py-2 font-semibold' onClick={() => changeSort(key)}>
                    <span className='inline-flex items-center gap-2'>
                      {label}
                      <span className='text-xs text-gray-500'>{sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={4} className='px-3 py-4 text-gray-500'>No data</td></tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr key={i} className={classNames(i % 2 ? 'bg-white' : 'bg-gray-50')}>
                    <td className='whitespace-nowrap px-3 py-2 align-top'>{r.year ?? ''}</td>
                      <td className='px-3 py-2 align-top'>{query ? highlightText(r.journal || '', query) : (r.journal || '')}</td>
                      <td className='max-w-[540px] px-3 py-2 align-top'><div className='truncate' title={r.title}>{query ? highlightText(r.title || '', query) : (r.title || '')}</div></td>
                      <td className='px-3 py-2 align-top'>{query ? highlightText(r.authors || '', query) : (r.authors || '')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {query && !loading && !err && (
        <div className='flex items-center justify-between border-t p-3 text-sm'>
          <div>Total <b>{sorted.length}</b> records, page <b>{page}</b>/<b>{totalPages}</b></div>
          <div className='flex items-center gap-2'>
            <button disabled={page <= 1} onClick={() => setPage(1)} className='rounded-lg border px-2 py-1 disabled:opacity-40'>⏮</button>
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className='rounded-lg border px-2 py-1 disabled:opacity-40'>Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className='rounded-lg border px-2 py-1 disabled:opacity-40'>Next</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className='rounded-lg border px-2 py-1 disabled:opacity-40'>⏭</button>
          </div>
        </div>
      )}
    </div>
  )
}


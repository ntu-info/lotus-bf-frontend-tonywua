
import { useCallback, useRef, useState } from 'react'
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import './App.css'

export default function App () {
  const [query, setQuery] = useUrlQueryState('q')

  const handlePickTerm = useCallback((t) => {
    setQuery((q) => (q ? `${q} ${t}` : t))
  }, [setQuery])

  // --- resizable panes state ---
  const gridRef = useRef(null)
  const [sizes, setSizes] = useState([28, 44, 28]) // [left, middle, right]
  const MIN_PX = 240

  const startDrag = (which, e) => {
    e.preventDefault()
    const startX = e.clientX
    const rect = gridRef.current.getBoundingClientRect()
    const total = rect.width
    const curPx = sizes.map(p => (p / 100) * total)

    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX
      if (which === 0) {
        let newLeft = curPx[0] + dx
        let newMid = curPx[1] - dx
        if (newLeft < MIN_PX) { newMid -= (MIN_PX - newLeft); newLeft = MIN_PX }
        if (newMid < MIN_PX) { newLeft -= (MIN_PX - newMid); newMid = MIN_PX }
        const s0 = (newLeft / total) * 100
        const s1 = (newMid / total) * 100
        const s2 = 100 - s0 - s1
        setSizes([s0, s1, Math.max(s2, 0)])
      } else {
        let newMid = curPx[1] + dx
        let newRight = curPx[2] - dx
        if (newMid < MIN_PX) { newRight -= (MIN_PX - newMid); newMid = MIN_PX }
        if (newRight < MIN_PX) { newMid -= (MIN_PX - newRight); newRight = MIN_PX }
        const s1 = (newMid / total) * 100
        const s2 = (newRight / total) * 100
        const s0 = (curPx[0] / total) * 100
        setSizes([s0, s1, Math.max(s2, 0)])
      }
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div className="app">
      {/* Inline style overrides removed — visual tokens and layout handled in App.css */}

      <header className="app__header">
        <div className="app__header-row">
          <h1 className="app__title">LoTUS-BF</h1>
          <div className="app__brand-badge">Search</div>
          <div className="app__header-decor" aria-hidden>
            <div className="spark">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 2C12 2 15 6 18 6C21 6 22 9 22 11C22 14 20 16 18 18C16 20 12 22 12 22C12 22 8 20 6 18C4 16 2 14 2 11C2 9 3 6 6 6C9 6 12 2 12 2Z" stroke="rgba(59,130,246,0.9)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="11" r="1.8" fill="rgba(59,130,246,0.9)" />
              </svg>
            </div>
          </div>
        </div>
        <div className="app__subtitle">Location-or-Term Unified Search for Brain Functions</div>
        <div className="app__query-display">Current query:
          {query ? (
            <span className="search-term-inline">{
              // render query tokens but avoid highlighting operators like AND/OR/NOT
              String(query).split(/\s+/).map((t, i) => {
                const low = t.toLowerCase()
                if (['and','or','not','reset','(',')'].includes(low)) {
                  return <span key={i} style={{ marginLeft: 6, color: 'var(--muted)' }}>{t}</span>
                }
                return <span key={i} className='search-term' style={{ marginLeft: 6 }}>{t}</span>
              })
            }</span>
          ) : (
            <span className="search-term">(empty)</span>
          )}
        </div>
      </header>

      <main className="app__grid" ref={gridRef}>
        <section className="card" style={{ flexBasis: `${sizes[0]}%` }}>
          <div className="card__title">Terms</div>
          <div className="card__body panel panel--soft">
            <Terms onPickTerm={handlePickTerm} />
          </div>
        </section>

        <div className="resizer" aria-label="Resize left/middle" onMouseDown={(e) => startDrag(0, e)} />

        <section className="card card--stack" style={{ flexBasis: `${sizes[1]}%` }}>
          <div className="card__body">
            <QueryBuilder query={query} setQuery={setQuery} />
            {/* <div className="hint">Current Query：<code className="hint__code">{query || '(empty)'}</code></div> */}
            <div className="divider" />
            <Studies query={query} />
          </div>
        </section>

        <div className="resizer" aria-label="Resize middle/right" onMouseDown={(e) => startDrag(1, e)} />

        <section className="card" style={{ flexBasis: `${sizes[2]}%` }}>
          <div className="card__body">
            <NiiViewer query={query} />
          </div>
        </section>
      </main>
    </div>
  )
}

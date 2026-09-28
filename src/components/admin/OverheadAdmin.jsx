import { useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { uid } from '../../engine/ids.js'
import { PALETTE } from '../../engine/constants.js'

export default function OverheadAdmin() {
  const { board, addOverhead, removeOverhead } = useBoard()
  const [name, setName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addOverhead({ id: uid('ov_'), name: name.trim(), color: PALETTE[board.overhead.length % PALETTE.length] })
    setName('')
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input placeholder="Overhead category (e.g. Training)" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 1 }} />
        <button className="btn primary" type="submit">
          Add
        </button>
      </form>
      {board.overhead.map((o) => (
        <div key={o.id} className="card-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span className="avatar" style={{ background: o.color, width: 10, height: 10, borderRadius: 3 }} />
          <div style={{ flex: 1, marginLeft: 8, fontWeight: 650, fontSize: 13 }}>{o.name}</div>
          {o.locked ? (
            <span className="badge na">Locked</span>
          ) : (
            <button
              className="icon-btn"
              onClick={() => {
                if (window.confirm('Remove ' + o.name + '?')) removeOverhead(o.id)
              }}
            >
              &#10005;
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

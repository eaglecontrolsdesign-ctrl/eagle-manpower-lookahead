import { useEffect, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useRequests } from '../../context/RequestsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { dateOf } from '../../engine/dates.js'
import { DAY_LABELS, labelDays, REQUEST_STATUS, myRequests } from '../../engine/requests.js'

const STATUS_BADGE = { open: 'warn', approved: 'good', declined: 'bad', cancelled: 'na' }

function when(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function RequestsPage() {
  const rq = useRequests()
  const { board, setDay } = useBoard()
  const toast = useToast()
  const ui = useUi()
  const canAct = rq.scope.isAdmin || rq.scope.role === 'coordinator'
  const [tab, setTab] = useState(canAct ? 'action' : 'mine')
  const [replyFor, setReplyFor] = useState(null)
  const [replyText, setReplyText] = useState('')

  // Opening the page acknowledges the outcomes of my own requests (clears the sidebar count).
  useEffect(() => {
    if (rq.unseen.length) rq.markSeen(rq.unseen.map((r) => r.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rq.unseen.length])

  const mine = myRequests(rq.requests, rq.me)
  const list = tab === 'action' ? rq.actionable : tab === 'mine' ? mine : rq.requests

  function nameOf(id) {
    const p = board.projects.find((x) => x.id === id) || board.overhead.find((x) => x.id === id)
    return p ? p.name : id === '__HOL' ? 'Holiday' : id
  }

  function nowOn(r) {
    return r.dayIndexes.map((di) => {
      const v = board.days[r.personId + '|' + r.wkKey + '|' + di]
      return DAY_LABELS[di] + ' ' + (v ? nameOf(v) : 'free')
    })
  }

  async function approve(r) {
    if (!board.people.some((p) => p.id === r.personId)) return toast(r.personName + ' is no longer on the roster — decline this request instead', 'error')
    if (!board.projects.some((p) => p.id === r.projectId)) return toast(r.projectName + ' is no longer a project — decline this request instead', 'error')
    const busy = r.dayIndexes.filter((di) => {
      const v = board.days[r.personId + '|' + r.wkKey + '|' + di]
      return v && v !== r.projectId
    })
    const msg =
      'Approve and move ' + r.personName + ' to ' + r.projectName + ' for ' + labelDays(r.dayIndexes) + '?' + (busy.length ? '\n\nThis replaces: ' + busy.map((di) => DAY_LABELS[di] + ' ' + nameOf(board.days[r.personId + '|' + r.wkKey + '|' + di])).join(', ') : '')
    if (!window.confirm(msg)) return
    try {
      r.dayIndexes.forEach((di) => setDay(r.personId, r.wkKey, di, r.projectId))
      await rq.resolve(r.id, 'approved', 'Approved — ' + r.personName + ' moved to ' + r.projectName + ' for ' + labelDays(r.dayIndexes) + '.')
      toast('Approved · ' + r.personName + ' → ' + r.projectName)
    } catch (err) {
      toast('Could not approve: ' + err.message, 'error')
    }
  }

  async function decline(r) {
    const reason = window.prompt('Decline this request? Add a short reason for ' + r.fromEmail + ' (optional):', '')
    if (reason === null) return
    try {
      await rq.resolve(r.id, 'declined', reason.trim() ? 'Declined — ' + reason.trim() : 'Declined.')
      toast('Declined')
    } catch (err) {
      toast('Could not decline: ' + err.message, 'error')
    }
  }

  async function cancel(r) {
    if (!window.confirm('Withdraw this request?')) return
    try {
      await rq.cancel(r.id)
      toast('Request withdrawn')
    } catch (err) {
      toast('Could not withdraw: ' + err.message, 'error')
    }
  }

  async function sendReply(r) {
    const text = replyText.trim()
    if (!text) return
    try {
      await rq.reply(r.id, text)
      setReplyFor(null)
      setReplyText('')
    } catch (err) {
      toast('Could not reply: ' + err.message, 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Requests</div>
          <div className="page-subtitle">
            Ask another branch's coordinator for one of their people · approving moves the days on the board
            {rq.scope.role === 'coordinator' && rq.scope.branch ? ' · you coordinate ' + rq.scope.branch : ''}
          </div>
        </div>
      </div>

      <div className="board-toolbar">
        <div className="pill-tabs">
          {canAct && (
            <button className={'pill-tab' + (tab === 'action' ? ' on' : '')} onClick={() => setTab('action')}>
              Needs my action{rq.actionable.length ? ' · ' + rq.actionable.length : ''}
            </button>
          )}
          <button className={'pill-tab' + (tab === 'mine' ? ' on' : '')} onClick={() => setTab('mine')}>
            My requests{mine.length ? ' · ' + mine.length : ''}
          </button>
          <button className={'pill-tab' + (tab === 'all' ? ' on' : '')} onClick={() => setTab('all')}>
            All{rq.requests.length ? ' · ' + rq.requests.length : ''}
          </button>
        </div>
      </div>

      {!rq.ready ? (
        <div className="empty-block">Loading…</div>
      ) : !list.length ? (
        <div className="empty-block">
          {tab === 'action' ? 'Nothing waiting on you.' : tab === 'mine' ? (
            <>
              You haven't sent any requests. On the Manpower Board, click a day of someone in another branch to ask for them.
            </>
          ) : (
            'No requests yet.'
          )}
        </div>
      ) : (
        list.map((r) => {
          const date = dateOf(r.wkKey, r.dayIndexes[0])
          const isMine = r.fromEmail === rq.me
          const actionable = r.status === 'open' && rq.canResolve(r)
          return (
            <div key={r.id} className={'card request-card' + (actionable ? ' actionable' : '')}>
              <div className="card-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-title">
                    {r.personName}
                    <span style={{ fontWeight: 500, color: 'var(--muted)' }}> · {labelDays(r.dayIndexes)} · week of {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="card-subtitle">
                    Needed on <b>{r.projectName}</b> · asked by {isMine ? 'you' : r.fromEmail} · {when(r.createdAt)} · to the {r.toBranch} coordinator
                  </div>
                </div>
                <span className={'badge ' + (STATUS_BADGE[r.status] || 'na')}>{REQUEST_STATUS[r.status] || r.status}</span>
              </div>

              {r.message && <div className="request-message">{r.message}</div>}

              <div className="request-meta">
                <span>
                  <b>Now on:</b> {nowOn(r).join(' · ')}
                </span>
                <button className="link-btn" onClick={() => ui.openEmployee(r.personId)}>
                  Open {r.personName.split(' ')[0]}
                </button>
              </div>

              {(r.thread || []).length > 0 && (
                <div className="request-thread">
                  {r.thread.map((t, i) => (
                    <div key={i} className="request-reply">
                      <b>{t.by === rq.me ? 'You' : t.by}</b> <span style={{ color: 'var(--muted)' }}>{when(t.at)}</span>
                      <div>{t.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {replyFor === r.id ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input autoFocus style={{ flex: 1 }} value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply(r)} placeholder="Reply…" />
                  <button className="btn primary" onClick={() => sendReply(r)}>
                    Send
                  </button>
                  <button className="btn" onClick={() => setReplyFor(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="modal-actions" style={{ marginTop: 8 }}>
                  <button className="btn ghost" onClick={() => { setReplyFor(r.id); setReplyText('') }}>
                    Reply
                  </button>
                  {isMine && r.status === 'open' && (
                    <button className="btn" onClick={() => cancel(r)}>
                      Withdraw
                    </button>
                  )}
                  {actionable && (
                    <>
                      <button className="btn danger" onClick={() => decline(r)}>
                        Decline
                      </button>
                      <button className="btn primary" onClick={() => approve(r)}>
                        Approve &amp; move
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

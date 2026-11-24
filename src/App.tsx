import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import ideas from './data/date-ideas.json'
import './App.css'

type Idea = { id: string; title: string }
type Phase = 'setup' | 'pick' | 'eliminate' | 'offer' | 'finished'
type Game = {
  board: Idea[]
  offers: Idea[]
  held: string
  eliminated: string[]
  round: number
  phase: Phase
  chosen: Idea | null
  dealt: boolean
}
const key = 'date-or-nah-custom-ideas'
const roundSizes = [5, 4, 3, 3]
const emptyGame: Game = { board: [], offers: [], held: '', eliminated: [], round: 0, phase: 'setup', chosen: null, dealt: false }

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function loadCustom(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 100) : []
  } catch {
    return []
  }
}

function App() {
  const [custom, setCustom] = useState<string[]>(loadCustom)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [game, setGame] = useState<Game>(emptyGame)
  const dealButton = useRef<HTMLButtonElement>(null)
  const nahButton = useRef<HTMLButtonElement>(null)

  useEffect(() => { localStorage.setItem(key, JSON.stringify(custom)) }, [custom])
  useEffect(() => { if (game.phase === 'offer') dealButton.current?.focus() }, [game.phase])

  const heldIdea = game.board.find((item) => item.id === game.held)
  const lastEliminated = game.board.find((item) => item.id === game.eliminated.at(-1))
  const offer = game.offers[game.round - 1]
  const previousRounds = roundSizes.slice(0, game.round - 1).reduce((sum, count) => sum + count, 0)
  const eliminatedThisRound = game.eliminated.length - previousRounds
  const remainingThisRound = roundSizes[game.round - 1] - eliminatedThisRound

  function keepFocusInOffer(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    if (event.shiftKey && document.activeElement === dealButton.current) {
      event.preventDefault()
      nahButton.current?.focus()
    } else if (!event.shiftKey && document.activeElement === nahButton.current) {
      event.preventDefault()
      dealButton.current?.focus()
    }
  }

  function addIdea(event: FormEvent) {
    event.preventDefault()
    const title = draft.trim().replace(/\s+/g, ' ')
    if (!title) return
    if (title.length > 80) { setError('Keep ideas under 80 characters.'); return }
    if (custom.some((item) => item.toLowerCase() === title.toLowerCase())) { setError('You already added that idea.'); return }
    if (custom.length >= 100) { setError('You can save up to 100 ideas.'); return }
    setCustom([...custom, title])
    setDraft('')
    setError('')
  }

  function start() {
    const selectedCustom: Idea[] = shuffle(custom.map((title, index) => ({ id: 'custom-' + index, title }))).slice(0, 20)
    const customTitles = new Set(custom.map((title) => title.toLowerCase()))
    const builtIn: Idea[] = shuffle(ideas.filter((item) => !customTitles.has(item.title.toLowerCase())).map((item) => ({ id: 'built-in-' + item.id, title: item.title })))
    const selected = shuffle([...selectedCustom, ...builtIn.slice(0, 20 - selectedCustom.length)])
    setGame({ ...emptyGame, board: selected.slice(0, 16), offers: selected.slice(16), phase: 'pick' })
  }

  function selectCard(id: string) {
    if (game.phase === 'pick') {
      setGame({ ...game, held: id, round: 1, phase: 'eliminate' })
    } else if (game.phase === 'eliminate' && id !== game.held && !game.eliminated.includes(id)) {
      const eliminated = [...game.eliminated, id]
      const roundComplete = eliminated.length === previousRounds + roundSizes[game.round - 1]
      setGame({ ...game, eliminated, phase: roundComplete ? 'offer' : 'eliminate' })
    }
  }

  function deal() {
    setGame({ ...game, chosen: offer, dealt: true, phase: 'finished' })
  }

  function nah() {
    if (game.round === 4) setGame({ ...game, chosen: heldIdea || null, phase: 'finished' })
    else setGame({ ...game, round: game.round + 1, phase: 'eliminate' })
  }

  return <main className="shell">
    <header className="topbar">
      <span className="brand"><span aria-hidden="true">♥</span> Date or Nah</span>
      {game.phase !== 'setup' && <button className="link-button" disabled={game.phase === 'offer'} onClick={() => setGame(emptyGame)}>New game</button>}
    </header>
    {game.phase === 'setup' ? <section className="setup">
      <p className="eyebrow">A little mystery. A real date.</p>
      <h1>Let fate pick your next date.</h1>
      <p className="lead">Choose a secret card, let a few ideas go, and see if an offer changes your mind.</p>
      <div className="setup-box">
        <div className="setup-heading"><div><h2>Add your own ideas</h2><p>Optional. Your ideas go into the game first.</p></div><span className="badge">{custom.length} saved</span></div>
        <form onSubmit={addIdea} className="idea-form">
          <label className="sr-only" htmlFor="idea">Your date idea</label>
          <input id="idea" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="e.g. Sunset picnic by the water" maxLength={81} />
          <button type="submit" className="primary">Add idea</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
        {custom.length > 0 && <div className="custom-list" aria-label="Your date ideas">{custom.map((title, index) => <span className="custom-item" key={index}>{title}<button aria-label={'Remove ' + title} onClick={() => setCustom(custom.filter((_, i) => i !== index))}>×</button></span>)}</div>}
      </div>
      <button className="primary start" onClick={start}>Start game</button>
      <p className="hint">16 cards on the board · 4 surprise offers · 1 date to do together</p>
      <ul>
        {ideas.map((el) => (
          <li key={el.id} >{el.title}</li>
        ))}
      </ul>
    </section> : <section className="game">
      <div className="game-header">
        <div><p className="eyebrow">{game.phase === 'pick' ? 'Make your pick' : game.phase === 'finished' ? 'The reveal' : 'Round ' + game.round + ' of 4'}</p>
          <h1>{game.phase === 'pick' ? 'Pick your secret date.' : game.phase === 'eliminate' ? 'Let ' + remainingThisRound + ' ' + (remainingThisRound === 1 ? 'date' : 'dates') + ' go.' : game.phase === 'offer' ? 'Round ' + game.round + ' complete.' : 'Your next date is…'}</h1></div>
        {game.round > 0 && <div className="progress" aria-label={'Round ' + game.round + ' of 4'}>{[1,2,3,4].map((n) => <span key={n} className={n <= game.round ? 'active' : ''}/>)}</div>}
      </div>
      <div className="board" aria-label="Date cards">{game.board.map((item, index) => {
        const isHeld = item.id === game.held
        const isGone = game.eliminated.includes(item.id)
        const enabled = game.phase === 'pick' || (game.phase === 'eliminate' && !isHeld && !isGone)
        return <button key={item.id} className={'card' + (isHeld ? ' held' : '') + (isGone ? ' gone' : '')} disabled={!enabled} onClick={() => selectCard(item.id)} aria-label={isHeld ? 'Card ' + (index + 1) + ', your secret card' : isGone ? 'Card ' + (index + 1) + ', eliminated: ' + item.title : 'Choose card ' + (index + 1)}>
          {isGone ? <><span className="card-label">Eliminated</span><span className="card-title">{item.title}</span></> : <><span className="heart">♥</span><span className="card-label">{isHeld ? 'Your card' : String(index + 1).padStart(2, '0')}</span></>}
        </button>
      })}</div>
      <aside className="message" aria-live="polite">
        {game.phase === 'pick' && <><span className="spark">✦</span><div><h2>One card is yours.</h2><p>Its date stays hidden until the game ends.</p></div></>}
        {game.phase === 'eliminate' && <><span className="spark">✦</span><div><h2>Pick {remainingThisRound} {remainingThisRound === 1 ? 'card' : 'cards'} to eliminate.</h2><p>Each date is revealed as you go. Your offer comes after the round.</p></div></>}
        {game.phase === 'offer' && <><span className="spark">✦</span><div><h2>Your offer is ready.</h2><p>Choose Deal or Nah to continue.</p></div></>}
        {game.phase === 'finished' && <div className="message-row"><div><span className="overline">{game.dealt ? 'You took the offer' : 'You kept your card'}</span><h2>{game.chosen?.title}</h2>{game.dealt && <p>Your original card was: <strong>{heldIdea?.title}</strong></p>}</div><button className="primary" onClick={start}>Play again</button></div>}
      </aside>
    </section>}
    {game.phase === 'offer' && <div className="modal-backdrop">
      <div className="offer-modal" role="dialog" aria-modal="true" aria-labelledby="offer-title" aria-describedby="offer-description" onKeyDown={keepFocusInOffer}>
        <p className="eyebrow">Round {game.round} offer</p>
        <p className="modal-context">Last eliminated: {lastEliminated?.title}</p>
        <h2 id="offer-title">Deal or nah?</h2>
        <div className="offer-card"><span className="overline">A date from outside the board</span><strong>{offer?.title}</strong></div>
        <p id="offer-description">Take this date, or keep your secret card{game.round < 4 ? ' and play the next round' : ''}.</p>
        <div className="modal-actions"><button className="primary" ref={dealButton} onClick={deal}>Deal</button><button className="secondary" ref={nahButton} onClick={nah}>Nah</button></div>
      </div>
    </div>}
  </main>
}

export default App

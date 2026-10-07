import type { ReactNode } from 'react'
import './BoardStage.css'

export type BoardSeat = {
  avatar: string
  name: string
  detail?: string
  pill?: string
  active?: boolean
  tone?: 'you' | 'cpu' | 'neutral'
}

type Props = {
  children: ReactNode
  /** Short status above the board (e.g. turn / level). */
  status?: string
  topSeat?: BoardSeat
  bottomSeat?: BoardSeat
  className?: string
}

function SeatBar({ seat }: { seat: BoardSeat }) {
  const tone = seat.tone ?? 'neutral'
  return (
    <div
      className={`board-seat is-${tone}${seat.active ? ' is-active' : ''}`}
    >
      <span className="board-seat__avatar" aria-hidden>
        {seat.avatar}
      </span>
      <div className="board-seat__meta">
        <strong>{seat.name}</strong>
        {seat.detail ? <span className="muted">{seat.detail}</span> : null}
      </div>
      {seat.pill ? <span className="board-seat__pill">{seat.pill}</span> : null}
    </div>
  )
}

/** Decorative play area for board games with leftover panel space. */
export default function BoardStage({
  children,
  status,
  topSeat,
  bottomSeat,
  className = '',
}: Props) {
  return (
    <div className={`board-stage${className ? ` ${className}` : ''}`}>
      {topSeat ? <SeatBar seat={topSeat} /> : null}
      <div className="board-stage__frame">
        <span className="board-stage__deco board-stage__deco--tl" aria-hidden />
        <span className="board-stage__deco board-stage__deco--tr" aria-hidden />
        <span className="board-stage__deco board-stage__deco--bl" aria-hidden />
        <span className="board-stage__deco board-stage__deco--br" aria-hidden />
        {status ? <p className="board-stage__status muted">{status}</p> : null}
        <div className="board-stage__play">{children}</div>
      </div>
      {bottomSeat ? <SeatBar seat={bottomSeat} /> : null}
    </div>
  )
}

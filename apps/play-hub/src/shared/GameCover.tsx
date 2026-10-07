import type { CSSProperties } from 'react'
import type { GameMeta } from '../data/games'
import { COVERS, loadCovers, useCoversReady } from '../games/covers'

type Props = {
  game: GameMeta
  className?: string
  style?: CSSProperties
}

/** Cover art when the game has one, otherwise its emoji icon. */
export default function GameCover({ game, className, style }: Props) {
  const ready = useCoversReady()
  if (!ready) void loadCovers()
  const Cover = ready ? COVERS[game.id] : undefined
  if (!Cover) {
    return (
      <span className={className} style={style} aria-hidden>
        {game.icon}
      </span>
    )
  }
  return (
    <span className={`game-cover${className ? ` ${className}` : ''}`} style={style} aria-hidden>
      <Cover />
    </span>
  )
}

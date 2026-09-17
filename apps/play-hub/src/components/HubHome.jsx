import { Link } from 'react-router-dom';

export default function HubHome({ games }) {
  return (
    <div className="hub">
      <div className="hub-top">
        <div className="hub-brand">
          <div className="hub-logo" aria-hidden="true" />
          <span>TTGO Play Hub</span>
        </div>
        <a className="hub-link" href="/">
          ← Site home
        </a>
      </div>

      <h1>Vite games</h1>
      <p className="hub-lead">
        New React games live here. Classic HTML games stay on the main TTGO homepage.
      </p>

      <div className="hub-grid" role="list">
        {games.map((game) => (
          <Link
            key={game.id}
            className="hub-tile"
            role="listitem"
            to={game.path}
          >
            <span className="hub-tile-icon">
              <img src={game.icon} alt="" width="72" height="72" />
            </span>
            <span className="hub-tile-name">{game.name}</span>
            <span className="hub-tile-desc">{game.shortDesc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

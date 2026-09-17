import { Link } from 'react-router-dom';

export default function GameShell({ title, backTo, children }) {
  return (
    <div className="shell">
      <div className="shell-bar">
        <Link className="shell-back" to={backTo}>
          ← Hub
        </Link>
        <h1 className="shell-title">{title}</h1>
        <a className="shell-back" href="/">
          Home
        </a>
      </div>
      {children}
    </div>
  );
}

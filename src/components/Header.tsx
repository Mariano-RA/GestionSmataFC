'use client';

import DarkModeToggle from './DarkModeToggle';

export default function Header() {
  return (
    <div className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>⚽ SMATA LIBRE ⚽</h1>
        <DarkModeToggle />
      </div>
    </div>
  );
}

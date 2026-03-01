'use client';

import { useEffect, useState } from 'react';

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedMode ? savedMode === 'true' : prefersDark;
    setIsDark(shouldBeDark);
    applyDarkMode(shouldBeDark);
  }, []);

  const applyDarkMode = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', String(dark));
  };

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    applyDarkMode(!isDark);
  };

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={toggleDarkMode}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      style={{
        background: 'rgba(255, 255, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '18px',
        transition: 'all 0.2s'
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem('theme');
    if (s === 'light') return false;
    if (s === 'dark') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  function setTheme(mode) {
    if (mode === 'dark') setDark(true);
    else if (mode === 'light') setDark(false);
    else setDark((d) => !d);
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d), setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

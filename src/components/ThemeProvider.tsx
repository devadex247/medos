'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark as pre-existing theme
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read the current state of the html element class first (which the blocking script in head sets)
    const root = window.document.documentElement;
    const hasDarkClass = root.classList.contains('dark');
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    // Select initial theme based on local storage, the HTML class set by head script, or system preference
    let initialTheme: Theme = 'dark';
    if (savedTheme) {
      initialTheme = savedTheme;
    } else if (hasDarkClass) {
      initialTheme = 'dark';
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      initialTheme = prefersDark ? 'dark' : 'light';
    }

    setTheme(initialTheme);
    setMounted(true);

    // Sync HTML class
    if (initialTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    const root = window.document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

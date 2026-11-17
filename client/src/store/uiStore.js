import { create } from 'zustand';

// Theme, language and saved rooms are remembered in this browser only
const read = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const systemDark = () => { try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } };

export function applyUi({ theme, lang }) {
  const html = document.documentElement;
  html.classList.toggle('dark', theme === 'dark');
  html.lang = lang;
  html.dir = lang === 'ur' ? 'rtl' : 'ltr';
}

export const useUi = create((set, get) => ({
  theme: read('ls_theme', systemDark() ? 'dark' : 'light'),
  lang: read('ls_lang', 'en'),
  saved: read('ls_saved', []),
  toggleTheme: () => { const theme = get().theme === 'dark' ? 'light' : 'dark'; write('ls_theme', theme); set({ theme }); applyUi({ ...get(), theme }); },
  setLang: (lang) => { write('ls_lang', lang); set({ lang }); applyUi({ ...get(), lang }); },
  toggleSaved: (id) => { const saved = get().saved.includes(id) ? get().saved.filter((x) => x !== id) : [...get().saved, id]; write('ls_saved', saved); set({ saved }); },
}));

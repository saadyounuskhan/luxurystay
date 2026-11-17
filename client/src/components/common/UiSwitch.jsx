import { useUi } from '../../store/uiStore';

// Dark/light and English/Urdu buttons
export default function UiSwitch({ light = false }) {
  const { theme, lang, toggleTheme, setLang } = useUi();
  const cls = `h-10 min-w-10 rounded-lg px-3 text-sm font-semibold transition ${light ? 'border border-navy-soft text-[#E9DDBF] hover:bg-white/10' : 'border border-line bg-white text-navy hover:border-gold'}`;
  return (
    <div className="flex items-center gap-2">
      <button className={cls} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title="Theme">
        {theme === 'dark' ? '☀' : '☾'}
      </button>
      <button className={cls} onClick={() => setLang(lang === 'ur' ? 'en' : 'ur')} aria-label="Change language" title="Language">
        {lang === 'ur' ? 'EN' : 'اردو'}
      </button>
    </div>
  );
}

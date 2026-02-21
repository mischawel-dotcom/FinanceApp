import { useState, useRef, useEffect } from 'react';
import AppErrorBoundary from '../errors/AppErrorBoundary';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/income', label: 'Einkommen', icon: '💰' },
  { path: '/expenses', label: 'Ausgaben', icon: '💸' },
  { path: '/assets', label: 'Anlagen', icon: '📈' },
  { path: '/goals', label: 'Ziele', icon: '🎯' },
  { path: '/planning', label: 'Planung', icon: '📋' },
  { path: '/recommendations', label: 'Empfehlungen', icon: '💡' },
  { path: '/reports', label: 'Reports', icon: '📄' },
  { path: '/settings', label: 'Einstellungen', icon: '🔧' },
];

const bottomTabItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/expenses', label: 'Ausgaben', icon: '💸' },
  { path: '/planning', label: 'Planung', icon: '📋' },
  { path: '/recommendations', label: 'Tipps', icon: '💡' },
];

const moreMenuItems: NavItem[] = [
  { path: '/income', label: 'Einkommen', icon: '💰' },
  { path: '/assets', label: 'Anlagen', icon: '📈' },
  { path: '/goals', label: 'Ziele', icon: '🎯' },
  { path: '/reports', label: 'Reports', icon: '📄' },
  { path: '/settings', label: 'Einstellungen', icon: '🔧' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreMenuItems.some((item) => isActive(item.path));

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMoreOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded shadow"
      >
        Zum Inhalt springen
      </a>

      {/* Top Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-950/50 sticky top-0 z-50 border-b border-transparent dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">Finance App</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-1" aria-label="Hauptnavigation">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
        <AppErrorBoundary>
          {children}
        </AppErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="hidden lg:block bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Finance App - Entwickelt mit React & TypeScript
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom"
        aria-label="Mobile Navigation"
      >
        <div className="flex items-stretch justify-around">
          {bottomTabItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 py-2 min-h-[56px] transition-colors ${
                isActive(item.path)
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-200'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-[10px] mt-1 font-medium ${
                isActive(item.path) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {item.label}
              </span>
              {isActive(item.path) && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
              )}
            </Link>
          ))}

          {/* "Mehr" Tab with Popover */}
          <div className="relative flex-1" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              aria-expanded={isMoreOpen}
              aria-controls="more-menu"
              className={`flex flex-col items-center justify-center w-full py-2 min-h-[56px] transition-colors ${
                isMoreActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : isMoreOpen
                    ? 'text-gray-700 dark:text-gray-200'
                    : 'text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-200'
              }`}
            >
              <span className="text-xl leading-none">⋯</span>
              <span className={`text-[10px] mt-1 font-medium ${
                isMoreActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                Mehr
              </span>
              {isMoreActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
              )}
            </button>

            {isMoreOpen && (
              <div
                id="more-menu"
                className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2"
              >
                {moreMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
                        : 'text-gray-700 active:bg-gray-100 dark:text-gray-300 dark:active:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

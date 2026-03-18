import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, NavLink } from 'react-router-dom'
import './App.css'
import { IoRocketOutline } from "react-icons/io5"
import { GoDatabase, GoSun, GoMoon, GoBook, GoLinkExternal, GoArchive, GoKey, GoShieldCheck } from 'react-icons/go'
import IndexesPage from './pages/IndexesPage'
import CreateIndexPage from './pages/CreateIndexPage'
import IndexDetailPage from './pages/IndexDetailPage'
import VectorInsertPage from './pages/VectorInsertPage'
import SearchPage from './pages/SearchPage'
import VectorGetPage from './pages/VectorGetPage'
import WelcomePage from './pages/WelcomePage'
import TutorialsPage from './pages/TutorialsPage'
import BackupsPage from './pages/BackupsPage'
import { useTheme } from './useTheme'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import AuthModal from './components/AuthModal'
import { reinitializeEndee, setOnUnauthorized } from './api/client'

const NavItems = [
  {
    name: "Welcome",
    href: "/",
    icon: <IoRocketOutline className='h-6 w-6' />
  },
  {
    name: "Indexes",
    href: "/indexes",
    icon: <GoDatabase className='h-5 w-6' />
  },
  {
    name: "Backups",
    href: "/backups",
    icon: <GoArchive className='h-5 w-6' />
  },
  {
    name: "Tutorials",
    href: "/tutorials",
    icon: <GoBook className='h-5 w-6' />
  }
]

function Sidebar() {
  const [theme, setTheme] = useTheme();

  return (
    <aside className='text-black dark:text-white w-60 border-r border-border dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full'>
      <div className='flex items-center gap-2 py-4 px-6 border-b border-border dark:border-slate-800'>
        <img src="/endee-logo.svg" className='h-8' />
        <span className='text-2xl'>Endee</span>
      </div>

      <div className="flex flex-col gap-2 px-2 py-4 text-sm flex-1">
        {NavItems.map((item) => {
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${isActive
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-gray-200 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-secondary dark:hover:bg-slate-800 dark:hover:text-gray-300 hover:text-secondary-fg'
                }`
              }
            >
              <span>{item.icon}</span>
              <span className='text-sm'>{item.name}</span>
            </NavLink>
          )
        })}
      </div>

      {/* Footer Links */}
      <div className='border-t border-border dark:border-slate-800 px-2 py-4 space-y-1'>
        {/* Docs Link */}
        <a
          href="https://docs.endee.io"
          target="_blank"
          rel="noopener noreferrer"
          className='w-full flex items-center gap-3 px-4 py-3 rounded-sm text-slate-600 dark:text-slate-400 hover:bg-secondary dark:hover:bg-slate-800 dark:hover:text-gray-300 hover:text-secondary-fg'
        >
          <GoLinkExternal className='h-5 w-5' />
          <span className='text-sm'>Documentation</span>
        </a>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className='w-full flex items-center gap-3 px-4 py-3 rounded-sm text-slate-600 dark:text-slate-400 hover:bg-secondary dark:hover:bg-slate-800 dark:hover:text-gray-300 hover:text-secondary-fg'
        >
          {theme === "light" ? (
            <>
              <GoSun className='h-5 w-5' />
              <span className='text-sm'>Light Mode</span>
            </>
          ) : (
            <>
              <GoMoon className='h-5 w-5' />
              <span className='text-sm'>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

function Header() {
  const { token, isAuthenticated, openAuthModal, handleUnauthorized } = useAuth()

  // Reinitialize Endee client when token changes
  useEffect(() => {
    reinitializeEndee(token)
  }, [token])

  // Set up 401 handler - clears token and opens modal
  useEffect(() => {
    setOnUnauthorized(handleUnauthorized)
    return () => setOnUnauthorized(null)
  }, [handleUnauthorized])

  return (
    <div className='flex items-center justify-between py-4 px-6 border-b border-border dark:border-slate-800 dark:bg-slate-900 dark:text-white'>
      <div className='h-8'></div>
      <div className='flex items-center gap-4'>
        <button
          onClick={openAuthModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            isAuthenticated
              ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          {isAuthenticated ? (
            <>
              <GoShieldCheck className="w-4 h-4" />
              <span>Authenticated</span>
            </>
          ) : (
            <>
              <GoKey className="w-4 h-4" />
              <span>Set Token</span>
            </>
          )}
        </button>
        {/* <div className='text-xs text-slate-500 dark:text-slate-400'>
          v{APP_VERSION}
        </div> */}
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <BrowserRouter>
        <div className='flex flex-row h-screen bg-background dark:bg-slate-800'>
          {/* Navigation */}
          <Sidebar />

          {/* Routes */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <div className='bg-card-background dark:bg-slate-800 flex-1 overflow-auto flex flex-col items-center'>
              <div className="p-6 w-[95%]">
                <Routes>
                  <Route path='/' element={<WelcomePage />} />
                  <Route path='/indexes' element={<IndexesPage />} />
                  <Route path='/indexes/:indexName' element={<IndexDetailPage />} />
                  <Route path='/indexes/create' element={<CreateIndexPage />} />
                  <Route path='/indexes/:indexName/search' element={<SearchPage />} />
                  <Route path='/indexes/:indexName/insert' element={<VectorInsertPage />} />
                  <Route path='/indexes/:indexName/vectors' element={<VectorGetPage />} />
                  <Route path='/backups' element={<BackupsPage />} />
                  <Route path='/tutorials' element={<TutorialsPage />} />
                </Routes>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer>
          </footer>
        </div>

        {/* Auth Modal */}
        <AuthModal />
      </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App

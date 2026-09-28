import { useAuth } from './context/AuthContext.jsx'
import LoginScreen from './components/auth/LoginScreen.jsx'
import AppShell from './components/layout/AppShell.jsx'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading…</div>
  }

  return user ? <AppShell /> : <LoginScreen />
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { GuildLogo } from './components/GuildLogo'
import { logoutUrl } from './lib/auth'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Sessions } from './pages/Sessions'
import { SessionDetail } from './pages/SessionDetail'
import { NewSession } from './pages/NewSession'
import { Whiskies } from './pages/Whiskies'
import { WhiskyDetail } from './pages/WhiskyDetail'
import { NewWhisky } from './pages/NewWhisky'
import { Members } from './pages/Members'
import { TastingFlow } from './pages/TastingFlow'
import { AdHocTastings } from './pages/AdHocTastings'

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="animate-pulse">
        <GuildLogo size={64} />
      </div>
    </div>
  )
}

// Shown when someone signs in with an account that isn't a registered Guild member.
function NotMember({ name }: { name: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 py-14 text-center">
      <GuildLogo size={76} />
      <h1 className="mt-6 font-display text-3xl font-semibold text-cream">Members only</h1>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-cream-dim">
        You're signed in as <span className="text-cream">{name}</span>, but this account isn't
        registered with the Ealing Whisky Guild. Ask a Guild admin to add you as a member, then
        sign in again.
      </p>
      <a
        href={logoutUrl()}
        className="mt-8 flex items-center justify-center gap-2 rounded-full bg-cream px-6 py-3.5 font-semibold text-ink-950 transition-transform active:scale-[0.98]"
      >
        Sign out
      </a>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <Splash />

  // Signed in, but not a registered Guild member — block access to the app.
  if (user && !user.isMember) return <NotMember name={user.name} />

  return (
    <BrowserRouter>
      <Routes>
        {/* Publicly viewable — read-only when logged out, actions prompt sign-in */}
        <Route path="/sessions/new" element={<NewSession />} />

        {user ? (
          <>
            {/* Full-screen flows (no app chrome) */}
            <Route path="/taste" element={<TastingFlow />} />
            <Route path="/whiskies/new" element={<NewWhisky />} />
            <Route path="/whiskies/:id/edit" element={<NewWhisky />} />

            {/* Main app with nav */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/whiskies" element={<Whiskies />} />
              <Route path="/whiskies/:id" element={<WhiskyDetail />} />
              <Route path="/members" element={<Members />} />
              <Route path="/ad-hoc" element={<AdHocTastings />} />
            </Route>
          </>
        ) : (
          <Route path="/" element={<Landing />} />
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

export default function LoginForm() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const success = await login(email.trim().toLowerCase(), password)

    if (success) {
      navigate('/')
    } else {
      setError('Invalid email or password. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8',
        'w-full',
      )}
    >
      <h1
        className={cn(
          'text-3xl font-bold font-[\'Space_Grotesk\']',
          'bg-gradient-to-r from-[#10b981] to-[#6366f1] bg-clip-text text-transparent',
        )}
      >
        Welcome Back
      </h1>
      <p className="text-[#cbd5e1] mt-2 mb-8">
        Sign in to your ContentForge account
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#cbd5e1]" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(
              'bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 w-full',
              'text-[#f8fafc] placeholder:text-[#94a3b8]',
              'focus:border-[#10b981] focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.1)]',
              'transition-all',
            )}
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#cbd5e1]" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={cn(
              'bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 w-full',
              'text-[#f8fafc] placeholder:text-[#94a3b8]',
              'focus:border-[#10b981] focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.1)]',
              'transition-all',
            )}
          />
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full bg-[#10b981] text-[#0f172a] font-bold py-3 rounded-xl',
            'hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'cursor-pointer',
          )}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

    </div>
  )
}

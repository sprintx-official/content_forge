import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

export default function SignupForm() {
  const navigate = useNavigate()
  const signup = useAuthStore((s) => s.signup)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required.'
    if (!email.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Please enter a valid email address.'
    if (password.length < 6)
      return 'Password must be at least 6 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    const success = await signup(name.trim(), email.trim(), password)

    if (success) {
      navigate('/forge')
    } else {
      setError('An account with this email already exists.')
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
          'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent',
        )}
      >
        Create Account
      </h1>
      <p className="text-[#9ca3af] mt-2 mb-8">
        Join ContentForge and start creating
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              'bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 w-full',
              'text-[#f9fafb] placeholder:text-[#6b7280]',
              'focus:border-[#00f0ff] focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.1)]',
              'transition-all',
            )}
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              'bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 w-full',
              'text-[#f9fafb] placeholder:text-[#6b7280]',
              'focus:border-[#00f0ff] focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.1)]',
              'transition-all',
            )}
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(
              'bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 w-full',
              'text-[#f9fafb] placeholder:text-[#6b7280]',
              'focus:border-[#00f0ff] focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.1)]',
              'transition-all',
            )}
          />
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={cn(
              'bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 w-full',
              'text-[#f9fafb] placeholder:text-[#6b7280]',
              'focus:border-[#00f0ff] focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.1)]',
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
            'w-full bg-[#00f0ff] text-[#0a0e1a] font-bold py-3 rounded-xl',
            'hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'cursor-pointer',
          )}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-[#9ca3af] text-sm mt-6 text-center">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-[#00f0ff] hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

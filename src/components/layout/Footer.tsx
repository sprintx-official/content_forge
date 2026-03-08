export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0f172a]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-[#cbd5e1]">
          Built for Mass Communication Students
        </p>

        <div className="flex items-center gap-6">
          <a
            href="#"
            className="text-sm text-[#cbd5e1] transition-colors hover:text-[#f8fafc]"
          >
            GitHub
          </a>
          <a
            href="#"
            className="text-sm text-[#cbd5e1] transition-colors hover:text-[#f8fafc]"
          >
            About
          </a>
        </div>

        <p className="text-sm text-[#cbd5e1]">
          Powered by{' '}
          <span className="bg-gradient-to-r from-[#10b981] to-[#6366f1] bg-clip-text font-semibold text-transparent">
            ContentForge
          </span>
        </p>
      </div>
    </footer>
  )
}

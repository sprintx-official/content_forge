export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0e1a]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-[#9ca3af]">
          Built for Mass Communication Students
        </p>

        <div className="flex items-center gap-6">
          <a
            href="#"
            className="text-sm text-[#9ca3af] transition-colors hover:text-[#f9fafb]"
          >
            GitHub
          </a>
          <a
            href="#"
            className="text-sm text-[#9ca3af] transition-colors hover:text-[#f9fafb]"
          >
            About
          </a>
        </div>

        <p className="text-sm text-[#9ca3af]">
          Powered by{' '}
          <span className="bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text font-semibold text-transparent">
            ContentForge
          </span>
        </p>
      </div>
    </footer>
  )
}

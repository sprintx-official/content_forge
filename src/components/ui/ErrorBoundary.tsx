import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <AlertCircle className="size-10 text-red-400/60 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-white mb-1">Something went wrong</h3>
            <p className="text-xs text-[#cbd5e1] mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-[#cbd5e1] rounded-lg hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="size-3" />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

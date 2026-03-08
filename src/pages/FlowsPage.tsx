import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { AnyFlow, Workflow } from '../types'
import { SYSTEM_FLOWS } from '../constants/systemFlows'
import { FlowCard } from '../components/flows/FlowCard'
import { api } from '../lib/api'

function FlowsPage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.get<Workflow[]>('/api/workflows')
        setWorkflows(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch workflows:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setWorkflows([])
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflows()
  }, [])

  // Combine system flows with user workflows
  const allFlows: AnyFlow[] = [...SYSTEM_FLOWS, ...workflows]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Flows</h1>
          <p className="text-gray-400">
            Choose a flow to get started or manage your custom workflows
          </p>
        </div>
        <button
          onClick={() => navigate('/flows/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-[#0f172a] font-medium rounded-lg hover:bg-[#10b981]/90 transition-colors"
        >
          <Plus size={20} />
          Create Flow
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">
          <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading flows...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {allFlows.map((flow) => (
            <FlowCard key={flow.id} flow={flow} />
          ))}
        </div>
      )}

      {!loading && allFlows.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No flows available. Please try again later.
        </div>
      )}
    </div>
  )
}

export default FlowsPage

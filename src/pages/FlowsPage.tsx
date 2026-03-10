import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import type { AnyFlow, Workflow, FlowType } from '../types'
import { SYSTEM_FLOWS, FLOW_TYPE_COLORS } from '../constants/systemFlows'
import { FlowCard } from '../components/flows/FlowCard'
import { api } from '../lib/api'

type FilterType = 'all' | FlowType

function FlowsPage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.title = 'Flows — ContentForge'
    return () => { document.title = 'ContentForge' }
  }, [])

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

  const allFlows: AnyFlow[] = [...SYSTEM_FLOWS, ...workflows]

  const filteredFlows = useMemo(() => {
    let flows = allFlows
    if (filter !== 'all') {
      flows = flows.filter((f) => f.type === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      flows = flows.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
      )
    }
    return flows
  }, [allFlows, filter, search])

  const filterTabs: { id: FilterType; label: string; color?: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'text', label: 'Text', color: FLOW_TYPE_COLORS.text },
    { id: 'chat', label: 'Chat', color: FLOW_TYPE_COLORS.chat },
    { id: 'image', label: 'Image', color: FLOW_TYPE_COLORS.image },
    { id: 'video', label: 'Video', color: FLOW_TYPE_COLORS.video },
    { id: 'news', label: 'News', color: FLOW_TYPE_COLORS.news },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
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

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-[#cbd5e1] hover:text-white hover:bg-white/5'
              }`}
              style={filter === tab.id && tab.color ? { color: tab.color } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#cbd5e1]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flows..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-[#f8fafc] placeholder:text-[#cbd5e1]/50 focus:outline-none focus:ring-1 focus:ring-[#10b981]/50"
          />
        </div>
        <span className="text-xs text-[#cbd5e1]/60">{filteredFlows.length} flows</span>
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
          {filteredFlows.map((flow) => (
            <FlowCard key={flow.id} flow={flow} />
          ))}
        </div>
      )}

      {!loading && filteredFlows.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#cbd5e1] mb-2">
            {search ? `No flows matching "${search}"` : 'No flows available'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-sm text-[#10b981] hover:text-[#10b981]/80"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default FlowsPage

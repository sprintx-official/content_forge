import { useEffect, useState } from 'react'
import type { AnyFlow, Workflow } from '../types'
import { SYSTEM_FLOWS } from '../constants/systemFlows'
import { FlowCard } from '../components/flows/FlowCard'

function FlowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/workflows')
        if (!res.ok) throw new Error('Failed to fetch workflows')
        const data = await res.json()
        setWorkflows(Array.isArray(data) ? data : [])
      } catch (err) {
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Flows</h1>
        <p className="text-gray-600">
          Choose a flow to get started or manage your custom workflows
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading flows...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {allFlows.map((flow) => (
            <FlowCard key={flow.id} flow={flow} />
          ))}
        </div>
      )}

      {!loading && allFlows.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No flows available. Please try again later.
        </div>
      )}
    </div>
  )
}

export default FlowsPage

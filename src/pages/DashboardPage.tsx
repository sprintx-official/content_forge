import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Zap, Bot, GitBranch, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Workflow } from '@/types'
import { timeAgo } from '@/lib/timeAgo'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [agentCount, setAgentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Dashboard — ContentForge'
    return () => { document.title = 'ContentForge' }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [wfs] = await Promise.all([
          api.get<Workflow[]>('/api/workflows').catch(() => []),
        ])
        setWorkflows(Array.isArray(wfs) ? wfs : [])

        // Try to get agent count from admin store if available
        try {
          const agents = await api.get<any[]>('/api/agents')
          setAgentCount(Array.isArray(agents) ? agents.length : 0)
        } catch {
          setAgentCount(0)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8">
        <h1 className="text-4xl font-bold text-white mb-3">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-lg text-gray-400">
          Create and manage your content workflows with AI-powered agents
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Custom Workflows</p>
              <p className="text-3xl font-bold text-white">{workflows.length}</p>
            </div>
            <div className="p-3 bg-[#10b981]/20 rounded-lg">
              <GitBranch className="h-6 w-6 text-[#10b981]" />
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">AI Agents</p>
              <p className="text-3xl font-bold text-white">{agentCount}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Bot className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">System Status</p>
              <p className="text-3xl font-bold text-white text-green-400">Active</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Zap className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
        <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/flows/new')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#10b981]/20 to-[#10b981]/5 border border-[#10b981]/30 rounded-lg hover:bg-[#10b981]/30 transition-all group"
          >
            <Plus className="h-5 w-5 text-[#10b981]" />
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Create New Flow</p>
              <p className="text-sm text-gray-400">Set up a custom workflow</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#10b981]" />
          </button>

          <button
            onClick={() => navigate('/flows')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-lg hover:bg-white/15 transition-all group"
          >
            <Zap className="h-5 w-5 text-white/60" />
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Browse Flows</p>
              <p className="text-sm text-gray-400">View all available flows</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* Recent Workflows */}
      {workflows.length > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Your Custom Workflows</h2>
            <button
              onClick={() => navigate('/flows')}
              className="text-[#10b981] hover:text-[#10b981]/80 text-sm font-medium transition-colors"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {workflows.slice(0, 5).map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => navigate(`/flows/${workflow.id}`)}
                className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-lg transition-all group"
              >
                <div className="flex-1 text-left">
                  <p className="font-medium text-white group-hover:text-[#10b981]">{workflow.name}</p>
                  <p className="text-sm text-gray-500 truncate">{workflow.description || 'No description'}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{timeAgo(workflow.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-white/5 text-white/60 rounded">
                    {workflow.mode}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#10b981]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && workflows.length === 0 && (
        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-12 text-center">
          <GitBranch className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No custom workflows yet</h3>
          <p className="text-gray-400 mb-6">Create your first workflow to get started with AI-powered content generation</p>
          <button
            onClick={() => navigate('/flows/new')}
            className="px-6 py-2 bg-[#10b981] text-[#0f172a] font-medium rounded-lg hover:bg-[#10b981]/90 transition-colors"
          >
            Create Your First Flow
          </button>
        </div>
      )}
    </div>
  )
}

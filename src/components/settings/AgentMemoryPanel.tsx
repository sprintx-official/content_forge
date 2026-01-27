import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import * as memoryService from '@/services/memoryService'
import type { AgentMemoryItem } from '@/types'

interface AgentMemoryPanelProps {
  agentId: string
  agentName: string
  onClose: () => void
}

export default function AgentMemoryPanel({ agentId, agentName, onClose }: AgentMemoryPanelProps) {
  const [items, setItems] = useState<AgentMemoryItem[]>([])

  const load = async () => {
    const memory = await memoryService.getMemoryByAgentId(agentId)
    setItems(memory)
  }

  useEffect(() => {
    load()
  }, [agentId])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory entry?')) return
    await memoryService.deleteMemoryEntry(id)
    load()
  }

  const handleClearAll = async () => {
    if (!confirm(`Clear all memory for "${agentName}"? This cannot be undone.`)) return
    await memoryService.clearAgentMemory(agentId)
    load()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h3 className="text-lg font-semibold text-[#f9fafb]">
          Memory for {agentName}
        </h3>
      </div>

      {/* Summary + actions */}
      <div className="flex items-center gap-3">
        <Badge variant="default">{items.length} entr{items.length !== 1 ? 'ies' : 'y'}</Badge>
        {items.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll} className="text-red-400 hover:text-red-300">
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Clear All Memory
          </Button>
        )}
      </div>

      {/* Memory list */}
      {items.length === 0 ? (
        <p className="text-center text-[#9ca3af] py-8">No memory entries yet. Generate content with this agent to build memory.</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {items
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#f9fafb]">
                      {item.topic || 'Untitled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="text-[#9ca3af] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-[#d1d5db]">{item.summary}</p>
                <p className="text-xs text-[#6b7280] flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(item.createdAt).toLocaleDateString()} &middot;{' '}
                  {new Date(item.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

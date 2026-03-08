import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import WorkflowForm from '../components/settings/WorkflowForm'

function CreateFlowPage() {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate('/flows')
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <button
          onClick={handleClose}
          className="flex items-center gap-2 text-[#10b981] hover:text-[#10b981]/80 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Flows
        </button>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Create New Flow</h1>
          <p className="text-gray-400">
            Set up a new workflow with custom agents, steps, and configuration
          </p>
        </div>

        {/* Form */}
        <WorkflowForm onClose={handleClose} />
      </div>
    </div>
  )
}

export default CreateFlowPage

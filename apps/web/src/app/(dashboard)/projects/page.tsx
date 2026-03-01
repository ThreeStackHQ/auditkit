import { Activity, Plus } from 'lucide-react'
export default function ProjectsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Projects</h1>
        <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white" style={{ background: '#f97415' }}><Plus className="w-4 h-4" />New Project</button>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border" style={{ background: '#f9741518', borderColor: '#f9741530' }}>
          <Activity className="w-8 h-8" style={{ color: '#f97415' }} />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Create your first project</h2>
        <p className="text-sm text-gray-400 max-w-sm mb-6">Start logging user activity. Embed the AuditKit widget in 5 lines of code — no backend required.</p>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white" style={{ background: '#f97415' }}><Plus className="w-4 h-4" />New Project</button>
      </div>
    </div>
  )
}

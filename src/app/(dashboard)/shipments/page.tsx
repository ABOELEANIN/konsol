import { createClient } from '@/lib/supabase/server'
import { Package, Plus, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const STATUS_STYLES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:          { label: 'Pending',          className: 'bg-gray-500/15 text-gray-400 border-gray-500/30',   icon: <Clock size={12} /> },
  IN_PROGRESS:      { label: 'In Progress',      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   icon: <Clock size={12} /> },
  WAITING_EXTERNAL: { label: 'Waiting External', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: <AlertCircle size={12} /> },
  COMPLETED:        { label: 'Completed',        className: 'bg-green-500/15 text-green-400 border-green-500/30',  icon: <CheckCircle2 size={12} /> },
  BLOCKED:          { label: 'Blocked',          className: 'bg-red-500/15 text-red-400 border-red-500/30',       icon: <AlertCircle size={12} /> },
  SKIPPED:          { label: 'Skipped',          className: 'bg-gray-500/15 text-gray-500 border-gray-500/30',   icon: null },
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  FIN: <ArrowDownCircle size={14} className="text-blue-400" />,
  LIN: <ArrowDownCircle size={14} className="text-teal-400" />,
  FOU: <ArrowUpCircle size={14} className="text-purple-400" />,
  LOU: <ArrowUpCircle size={14} className="text-orange-400" />,
}

export default async function ShipmentsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Get user's tenant
  const { data: userRecord } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  let shipments: any[] = []

  if (userRecord?.tenant_id) {
    const { data } = await supabase
      .from('shipments')
      .select(`
        id, reference, description, status, created_at, due_at,
        modules ( code, name, direction, scope ),
        templates ( name )
      `)
      .eq('tenant_id', userRecord.tenant_id)
      .order('created_at', { ascending: false })
      .limit(50)

    shipments = data ?? []
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Shipments</h1>
          <p className="text-gray-400 text-sm mt-1">{shipments.length} active shipment{shipments.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/shipments/new"
          className="inline-flex items-center gap-2 bg-konsol-accent hover:bg-konsol-accent-dark text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Shipment
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'In Progress', value: shipments.filter(s => s.status === 'IN_PROGRESS').length, color: 'text-blue-400' },
          { label: 'Waiting External', value: shipments.filter(s => s.status === 'WAITING_EXTERNAL').length, color: 'text-yellow-400' },
          { label: 'Completed', value: shipments.filter(s => s.status === 'COMPLETED').length, color: 'text-green-400' },
          { label: 'Blocked', value: shipments.filter(s => s.status === 'BLOCKED').length, color: 'text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-konsol-800 border border-konsol-600 rounded-xl p-4">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {shipments.length === 0 ? (
        <div className="bg-konsol-800 border border-konsol-600 rounded-xl p-16 text-center">
          <Package size={40} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No shipments yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first shipment to start tracking your logistics process.</p>
          <Link
            href="/shipments/new"
            className="inline-flex items-center gap-2 bg-konsol-accent hover:bg-konsol-accent-dark text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Shipment
          </Link>
        </div>
      ) : (
        <div className="bg-konsol-800 border border-konsol-600 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-konsol-600">
                <th className="text-left text-gray-400 font-medium px-6 py-3">Reference</th>
                <th className="text-left text-gray-400 font-medium px-6 py-3">Module</th>
                <th className="text-left text-gray-400 font-medium px-6 py-3">Status</th>
                <th className="text-left text-gray-400 font-medium px-6 py-3">Due</th>
                <th className="text-left text-gray-400 font-medium px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s, i) => {
                const mod = s.modules as any
                const status = STATUS_STYLES[s.status] ?? STATUS_STYLES.PENDING
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-konsol-700 hover:bg-konsol-700/50 cursor-pointer transition-colors ${i === shipments.length - 1 ? 'border-0' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{s.reference}</div>
                      {s.description && <div className="text-gray-500 text-xs mt-0.5 truncate max-w-[200px]">{s.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {MODULE_ICONS[mod?.code] ?? <Package size={14} className="text-gray-500" />}
                        <span className="text-gray-300 font-mono text-xs bg-konsol-700 px-2 py-0.5 rounded">{mod?.code}</span>
                        <span className="text-gray-400 hidden lg:inline">{mod?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${status.className}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {s.due_at ? new Date(s.due_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(s.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

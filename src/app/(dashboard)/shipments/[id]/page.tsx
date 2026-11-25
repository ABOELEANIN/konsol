import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import {
  ArrowLeft, Package, ArrowDownCircle, ArrowUpCircle,
  Clock, CheckCircle2, AlertCircle, Circle, ChevronRight,
  User, Calendar, Flag, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import ShipmentActions from './ShipmentActions'
import StepActions from './StepActions'

const MODULE_COLORS: Record<string, { icon: React.ReactNode; badge: string; ring: string }> = {
  FIN: { icon: <ArrowDownCircle size={18} className="text-blue-400" />,   badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',   ring: 'ring-blue-500/40' },
  LIN: { icon: <ArrowDownCircle size={18} className="text-teal-400" />,   badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',   ring: 'ring-teal-500/40' },
  FOU: { icon: <ArrowUpCircle size={18} className="text-purple-400" />,   badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30', ring: 'ring-purple-500/40' },
  LOU: { icon: <ArrowUpCircle size={18} className="text-orange-400" />,   badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', ring: 'ring-orange-500/40' },
}

const STEP_STATUS: Record<string, { label: string; className: string; dotClass: string; icon: React.ReactNode }> = {
  PENDING:          { label: 'Pending',          className: 'text-gray-400',   dotClass: 'bg-gray-600',    icon: <Circle size={14} className="text-gray-600" /> },
  IN_PROGRESS:      { label: 'In Progress',      className: 'text-blue-400',   dotClass: 'bg-blue-500',    icon: <Clock size={14} className="text-blue-400 animate-pulse" /> },
  WAITING_EXTERNAL: { label: 'Waiting External', className: 'text-yellow-400', dotClass: 'bg-yellow-500',  icon: <AlertCircle size={14} className="text-yellow-400" /> },
  COMPLETED:        { label: 'Completed',        className: 'text-green-400',  dotClass: 'bg-green-500',   icon: <CheckCircle2 size={14} className="text-green-400" /> },
  BLOCKED:          { label: 'Blocked',          className: 'text-red-400',    dotClass: 'bg-red-500',     icon: <AlertCircle size={14} className="text-red-400" /> },
  SKIPPED:          { label: 'Skipped',          className: 'text-gray-600',   dotClass: 'bg-gray-700',    icon: <ChevronRight size={14} className="text-gray-600" /> },
}

const SHIPMENT_STATUS: Record<string, { label: string; className: string }> = {
  PENDING:          { label: 'Pending',     className: 'bg-gray-500/15 text-gray-300 border-gray-500/30' },
  IN_PROGRESS:      { label: 'In Progress', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  WAITING_EXTERNAL: { label: 'Waiting',     className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  COMPLETED:        { label: 'Completed',   className: 'bg-green-500/15 text-green-300 border-green-500/30' },
  BLOCKED:          { label: 'Blocked',     className: 'bg-red-500/15 text-red-300 border-red-500/30' },
}

export default async function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('tenant_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!userRecord?.tenant_id) redirect('/shipments')

  // Load the shipment
  const { data: shipment } = await supabase
    .from('shipments')
    .select(`
      id, reference, description, status, created_at, due_at, started_at, completed_at,
      modules ( id, code, name, direction, scope ),
      templates ( id, name, description ),
      stakeholders ( id, name, category, country_code )
    `)
    .eq('id', params.id)
    .eq('tenant_id', userRecord.tenant_id)
    .single()

  if (!shipment) notFound()

  const mod = shipment.modules as any
  const template = shipment.templates as any
  const counterparty = shipment.stakeholders as any

  // Load phases for this template, ordered
  const { data: phases } = await supabase
    .from('phases')
    .select('id, name, description, position')
    .eq('template_id', template.id)
    .eq('tenant_id', userRecord.tenant_id)
    .eq('is_active', true)
    .order('position')

  // Load steps for each phase
  const phaseIds = (phases ?? []).map(p => p.id)
  const { data: steps } = await supabase
    .from('steps')
    .select('id, phase_id, name, description, position, is_external, sla_hours, is_optional')
    .in('phase_id', phaseIds.length ? phaseIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('is_active', true)
    .order('position')

  // Load shipment_steps (runtime state)
  const stepIds = (steps ?? []).map(s => s.id)
  const { data: shipmentSteps } = await supabase
    .from('shipment_steps')
    .select('id, step_id, status, assigned_to, started_at, completed_at, due_at, notes')
    .eq('shipment_id', params.id)
    .in('step_id', stepIds.length ? stepIds : ['00000000-0000-0000-0000-000000000000'])

  // Build lookup: step_id -> shipment_step
  const stepStatusMap: Record<string, any> = {}
  for (const ss of (shipmentSteps ?? [])) {
    stepStatusMap[ss.step_id] = ss
  }

  // Group steps by phase
  const stepsByPhase: Record<string, any[]> = {}
  for (const step of (steps ?? [])) {
    if (!stepsByPhase[step.phase_id]) stepsByPhase[step.phase_id] = []
    stepsByPhase[step.phase_id].push(step)
  }

  // Compute overall progress
  const totalSteps = (steps ?? []).length
  const completedSteps = (steps ?? []).filter(s => stepStatusMap[s.id]?.status === 'COMPLETED').length
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const moduleStyle = MODULE_COLORS[mod?.code] ?? MODULE_COLORS.FIN
  const shipStatus = SHIPMENT_STATUS[shipment.status] ?? SHIPMENT_STATUS.PENDING

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Back nav */}
      <Link
        href="/shipments"
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        All Shipments
      </Link>

      {/* Header card */}
      <div className="bg-konsol-800 border border-konsol-600 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl bg-konsol-700 flex items-center justify-center ring-2 ${moduleStyle.ring}`}>
              {moduleStyle.icon}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white text-xl font-semibold">{shipment.reference}</h1>
                <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${moduleStyle.badge}`}>
                  {mod?.code} · {mod?.name}
                </span>
                <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${shipStatus.className}`}>
                  {shipStatus.label}
                </span>
              </div>
              {shipment.description && (
                <p className="text-gray-400 text-sm mt-1">{shipment.description}</p>
              )}
            </div>
          </div>
          <ShipmentActions
            shipmentId={shipment.id}
            currentStatus={shipment.status}
            userRole={userRecord.role}
          />
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-konsol-600">
          {counterparty && (
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink size={14} className="text-gray-500" />
              <span className="text-gray-400">Counterparty:</span>
              <span className="text-gray-200">{counterparty.name}</span>
              <span className="text-gray-600 text-xs">{counterparty.country_code}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Package size={14} className="text-gray-500" />
            <span className="text-gray-400">Template:</span>
            <span className="text-gray-200">{template?.name}</span>
          </div>
          {shipment.due_at && (
            <div className="flex items-center gap-2 text-sm">
              <Flag size={14} className="text-gray-500" />
              <span className="text-gray-400">Due:</span>
              <span className={`${new Date(shipment.due_at) < new Date() && shipment.status !== 'COMPLETED' ? 'text-red-400' : 'text-gray-200'}`}>
                {new Date(shipment.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-gray-500" />
            <span className="text-gray-400">Created:</span>
            <span className="text-gray-200">
              {new Date(shipment.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {totalSteps > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">Progress</span>
              <span className="text-gray-300 text-xs font-medium">{completedSteps} / {totalSteps} steps · {progressPct}%</span>
            </div>
            <div className="h-2 bg-konsol-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-konsol-accent rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Phases & Steps */}
      {(phases ?? []).length === 0 ? (
        <div className="bg-konsol-800 border border-konsol-600 rounded-xl p-12 text-center">
          <Package size={36} className="text-gray-600 mx-auto mb-3" />
          <h3 className="text-white font-medium mb-1">No phases configured</h3>
          <p className="text-gray-400 text-sm">This template has no phases yet. Add phases in the template builder.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(phases ?? []).map((phase, phaseIdx) => {
            const phaseSteps = stepsByPhase[phase.id] ?? []
            const phaseCompleted = phaseSteps.filter(s => stepStatusMap[s.id]?.status === 'COMPLETED').length
            const phaseTotal = phaseSteps.length

            return (
              <div key={phase.id} className="bg-konsol-800 border border-konsol-600 rounded-xl overflow-hidden">
                {/* Phase header */}
                <div className="flex items-center justify-between px-5 py-3 bg-konsol-700/40 border-b border-konsol-600">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-konsol-600 flex items-center justify-center text-xs text-gray-300 font-mono font-medium">
                      {phaseIdx + 1}
                    </span>
                    <span className="text-white font-medium text-sm">{phase.name}</span>
                    {phase.description && (
                      <span className="text-gray-500 text-xs hidden lg:inline">— {phase.description}</span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs">{phaseCompleted}/{phaseTotal}</span>
                </div>

                {/* Steps */}
                {phaseSteps.length === 0 ? (
                  <div className="px-5 py-4 text-gray-600 text-sm">No steps in this phase.</div>
                ) : (
                  <div className="divide-y divide-konsol-700">
                    {phaseSteps.map((step, stepIdx) => {
                      const ss = stepStatusMap[step.id]
                      const statusKey = ss?.status ?? 'PENDING'
                      const stepStyle = STEP_STATUS[statusKey] ?? STEP_STATUS.PENDING

                      return (
                        <div key={step.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-konsol-700/30 transition-colors">
                          {/* Step number + connector */}
                          <div className="flex flex-col items-center pt-0.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-medium border ${
                              statusKey === 'COMPLETED' ? 'bg-green-500/20 border-green-500/40 text-green-300' :
                              statusKey === 'IN_PROGRESS' ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' :
                              statusKey === 'BLOCKED' ? 'bg-red-500/20 border-red-500/40 text-red-300' :
                              'bg-konsol-700 border-konsol-600 text-gray-500'
                            }`}>
                              {statusKey === 'COMPLETED' ? <CheckCircle2 size={12} /> : (phaseIdx + 1) + '.' + (stepIdx + 1)}
                            </div>
                            {stepIdx < phaseSteps.length - 1 && (
                              <div className="w-px flex-1 bg-konsol-700 mt-1 min-h-[12px]" />
                            )}
                          </div>

                          {/* Step info */}
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${statusKey === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-white'}`}>
                                {step.name}
                              </span>
                              {step.is_external && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                  External
                                </span>
                              )}
                              {step.is_optional && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-500 border border-gray-600/30">
                                  Optional
                                </span>
                              )}
                              {step.sla_hours && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-konsol-700 text-gray-500 border border-konsol-600">
                                  SLA {step.sla_hours}h
                                </span>
                              )}
                            </div>
                            {step.description && (
                              <p className="text-gray-500 text-xs mt-0.5">{step.description}</p>
                            )}
                            {ss?.notes && (
                              <p className="text-gray-400 text-xs mt-1 italic">"{ss.notes}"</p>
                            )}
                          </div>

                          {/* Status + actions */}
                          <div className="flex items-center gap-3 shrink-0 relative">
                            {ss?.due_at && statusKey !== 'COMPLETED' && (
                              <span className="text-gray-500 text-xs hidden lg:inline">
                                Due {new Date(ss.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {ss?.completed_at && statusKey === 'COMPLETED' && (
                              <span className="text-gray-500 text-xs hidden lg:inline">
                                {new Date(ss.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            <StepActions
                              shipmentId={params.id}
                              shipmentStepId={ss?.id ?? null}
                              stepId={step.id}
                              tenantId={userRecord.tenant_id}
                              currentStatus={statusKey as any}
                              stepName={step.name}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state when no template phases but shipment exists */}
      {totalSteps === 0 && (phases ?? []).length > 0 && (
        <div className="mt-4 bg-konsol-800 border border-konsol-600 rounded-xl p-6 text-center text-gray-500 text-sm">
          Phases exist but have no steps configured.
        </div>
      )}
    </div>
  )
}

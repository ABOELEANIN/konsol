'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { CheckCircle2, Clock, AlertCircle, ChevronDown, Loader2, MessageSquare, X } from 'lucide-react'

type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING_EXTERNAL' | 'COMPLETED' | 'BLOCKED' | 'SKIPPED'

interface StepActionsProps {
  shipmentId: string
  shipmentStepId: string | null   // null = no runtime row yet
  stepId: string
  tenantId: string
  currentStatus: StepStatus
  stepName: string
}

const STATUS_OPTIONS: { value: StepStatus; label: string; icon: React.ReactNode; className: string }[] = [
  { value: 'IN_PROGRESS',      label: 'In Progress',      icon: <Clock size={13} className="text-blue-400" />,    className: 'text-blue-300' },
  { value: 'WAITING_EXTERNAL', label: 'Waiting External', icon: <AlertCircle size={13} className="text-yellow-400" />, className: 'text-yellow-300' },
  { value: 'COMPLETED',        label: 'Completed',        icon: <CheckCircle2 size={13} className="text-green-400" />, className: 'text-green-300' },
  { value: 'BLOCKED',          label: 'Blocked',          icon: <AlertCircle size={13} className="text-red-400" />,    className: 'text-red-300' },
  { value: 'SKIPPED',          label: 'Skip',             icon: <ChevronDown size={13} className="text-gray-500" />,   className: 'text-gray-400' },
]

export default function StepActions({
  shipmentId, shipmentStepId, stepId, tenantId, currentStatus, stepName,
}: StepActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [noteMode, setNoteMode] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function setStatus(next: StepStatus) {
    setError(null)
    setOpen(false)

    const now = new Date().toISOString()
    const updates: Record<string, any> = { status: next }
    if (next === 'IN_PROGRESS' && currentStatus === 'PENDING') updates.started_at = now
    if (next === 'COMPLETED') updates.completed_at = now

    if (shipmentStepId) {
      const { error: err } = await supabase
        .from('shipment_steps')
        .update(updates)
        .eq('id', shipmentStepId)
      if (err) { setError(err.message); return }
    } else {
      const { error: err } = await supabase
        .from('shipment_steps')
        .insert({ shipment_id: shipmentId, tenant_id: tenantId, step_id: stepId, ...updates })
      if (err) { setError(err.message); return }
    }

    startTransition(() => { router.refresh() })
  }

  async function saveNote() {
    if (!note.trim()) { setNoteMode(false); return }
    setError(null)

    if (shipmentStepId) {
      const { error: err } = await supabase
        .from('shipment_steps')
        .update({ notes: note.trim() })
        .eq('id', shipmentStepId)
      if (err) { setError(err.message); return }
    } else {
      const { error: err } = await supabase
        .from('shipment_steps')
        .insert({ shipment_id: shipmentId, tenant_id: tenantId, step_id: stepId, status: 'PENDING', notes: note.trim() })
      if (err) { setError(err.message); return }
    }

    setNote('')
    setNoteMode(false)
    startTransition(() => { router.refresh() })
  }

  if (currentStatus === 'COMPLETED') {
    return (
      <span className="text-green-500 flex items-center gap-1 text-xs">
        <CheckCircle2 size={13} /> Done
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0" ref={ref}>
      {isPending && <Loader2 size={12} className="text-gray-500 animate-spin" />}

      {/* Quick complete */}
      <button
        onClick={() => setStatus('COMPLETED')}
        disabled={isPending}
        title="Mark complete"
        className="w-6 h-6 rounded flex items-center justify-center hover:bg-green-500/20 text-gray-600 hover:text-green-400 transition-colors disabled:opacity-40"
      >
        <CheckCircle2 size={14} />
      </button>

      {/* Add note */}
      <button
        onClick={() => setNoteMode(v => !v)}
        title="Add note"
        className="w-6 h-6 rounded flex items-center justify-center hover:bg-konsol-600 text-gray-600 hover:text-gray-300 transition-colors"
      >
        <MessageSquare size={13} />
      </button>

      {/* Status dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          disabled={isPending}
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-konsol-600 text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40"
        >
          <ChevronDown size={13} />
        </button>

        {open && (
          <div className="absolute right-0 top-8 z-50 bg-konsol-800 border border-konsol-600 rounded-xl shadow-xl w-48 py-1 overflow-hidden">
            {STATUS_OPTIONS.filter(o => o.value !== currentStatus).map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-konsol-700 transition-colors ${opt.className}`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline note panel */}
      {noteMode && (
        <div className="absolute right-0 mt-1 z-40 w-72 bg-konsol-800 border border-konsol-600 rounded-xl shadow-xl p-3"
          style={{ top: '100%' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 truncate max-w-[200px]">{stepName}</span>
            <button onClick={() => setNoteMode(false)} className="text-gray-600 hover:text-gray-300">
              <X size={12} />
            </button>
          </div>
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note…"
            rows={3}
            className="w-full bg-konsol-700 border border-konsol-600 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 resize-none focus:outline-none focus:border-konsol-accent"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setNoteMode(false)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1">Cancel</button>
            <button
              onClick={saveNote}
              disabled={isPending}
              className="text-xs bg-konsol-accent hover:bg-konsol-accent-dark text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {error && <span className="text-red-400 text-[10px] max-w-[120px] truncate">{error}</span>}
    </div>
  )
}

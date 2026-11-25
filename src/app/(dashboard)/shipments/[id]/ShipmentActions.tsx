'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { ChevronDown, Loader2 } from 'lucide-react'

type Status = 'PENDING' | 'IN_PROGRESS' | 'WAITING_EXTERNAL' | 'COMPLETED' | 'BLOCKED'

const TRANSITIONS: Record<Status, { label: string; next: Status; className: string }[]> = {
  PENDING:          [{ label: 'Start',    next: 'IN_PROGRESS',      className: 'bg-blue-600 hover:bg-blue-700 text-white' }],
  IN_PROGRESS:      [
                      { label: 'Mark Waiting', next: 'WAITING_EXTERNAL', className: 'bg-yellow-600 hover:bg-yellow-700 text-white' },
                      { label: 'Mark Blocked', next: 'BLOCKED',           className: 'bg-red-600 hover:bg-red-700 text-white' },
                      { label: 'Complete',     next: 'COMPLETED',         className: 'bg-green-600 hover:bg-green-700 text-white' },
                    ],
  WAITING_EXTERNAL: [
                      { label: 'Resume',       next: 'IN_PROGRESS',       className: 'bg-blue-600 hover:bg-blue-700 text-white' },
                      { label: 'Mark Blocked', next: 'BLOCKED',           className: 'bg-red-600 hover:bg-red-700 text-white' },
                    ],
  BLOCKED:          [{ label: 'Unblock', next: 'IN_PROGRESS', className: 'bg-blue-600 hover:bg-blue-700 text-white' }],
  COMPLETED:        [],
}

interface ShipmentActionsProps {
  shipmentId: string
  currentStatus: string
  userRole: string
}

export default function ShipmentActions({ shipmentId, currentStatus, userRole }: ShipmentActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const transitions = TRANSITIONS[currentStatus as Status] ?? []
  if (transitions.length === 0) return null

  async function updateStatus(next: Status) {
    setError(null)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const updates: Record<string, any> = { status: next }
    if (next === 'IN_PROGRESS' && currentStatus === 'PENDING') updates.started_at = new Date().toISOString()
    if (next === 'COMPLETED') updates.completed_at = new Date().toISOString()

    const { error: err } = await supabase
      .from('shipments')
      .update(updates)
      .eq('id', shipmentId)

    if (err) {
      setError(err.message)
      return
    }

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {isPending && <Loader2 size={14} className="text-gray-500 animate-spin" />}
        {transitions.map(t => (
          <button
            key={t.next}
            onClick={() => updateStatus(t.next)}
            disabled={isPending}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${t.className}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

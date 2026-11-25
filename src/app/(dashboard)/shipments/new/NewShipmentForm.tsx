'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  ArrowLeft, ArrowDownCircle, ArrowUpCircle, Package,
  ChevronRight, Loader2, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

type Module = {
  id: string
  code: string
  name: string
  direction: string
  scope: string
  is_active: boolean
}
type Template = { id: string; name: string; module_id: string; is_default: boolean }
type Stakeholder = { id: string; name: string; category: string; country_code: string }

const MODULE_ICONS: Record<string, React.ReactNode> = {
  FIN: <ArrowDownCircle size={18} className="text-blue-400" />,
  LIN: <ArrowDownCircle size={18} className="text-teal-400" />,
  FOU: <ArrowUpCircle size={18} className="text-purple-400" />,
  LOU: <ArrowUpCircle size={18} className="text-orange-400" />,
}

const MODULE_COLORS: Record<string, string> = {
  FIN: 'border-blue-500/40 bg-blue-500/10 hover:border-blue-400/60',
  LIN: 'border-teal-500/40 bg-teal-500/10 hover:border-teal-400/60',
  FOU: 'border-purple-500/40 bg-purple-500/10 hover:border-purple-400/60',
  LOU: 'border-orange-500/40 bg-orange-500/10 hover:border-orange-400/60',
}
const MODULE_COLORS_SELECTED: Record<string, string> = {
  FIN: 'border-blue-400 bg-blue-500/20 ring-1 ring-blue-500/50',
  LIN: 'border-teal-400 bg-teal-500/20 ring-1 ring-teal-500/50',
  FOU: 'border-purple-400 bg-purple-500/20 ring-1 ring-purple-500/50',
  LOU: 'border-orange-400 bg-orange-500/20 ring-1 ring-orange-500/50',
}

// Phase 0 modules only
const PHASE0 = ['FIN', 'LIN', 'FOU', 'LOU']

export default function NewShipmentForm({
  tenantId,
  userId,
  modules,
  templates,
  stakeholders,
}: {
  tenantId: string
  userId: string
  modules: Module[]
  templates: Template[]
  stakeholders: Stakeholder[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [counterpartyId, setCounterpartyId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  const phase0Modules = modules.filter(m => PHASE0.includes(m.code))
  const availableTemplates = templates.filter(t => t.module_id === selectedModule?.id)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedModule || !reference.trim()) return
    setError(null)

    startTransition(async () => {
      const { data, error: insertError } = await supabase
        .from('shipments')
        .insert({
          tenant_id: tenantId,
          module_id: selectedModule.id,
          template_id: selectedTemplate || null,
          reference: reference.trim(),
          description: description.trim() || null,
          counterparty_id: counterpartyId || null,
          due_at: dueAt || null,
          status: 'PENDING',
          created_by: userId,
        })
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      router.push(`/shipments`)
      router.refresh()
    })
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Back */}
      <Link
        href="/shipments"
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Shipments
      </Link>

      <h1 className="text-white text-2xl font-semibold mb-1">New Shipment</h1>
      <p className="text-gray-400 text-sm mb-8">Select a module and fill in the shipment details.</p>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Step 1 — Module */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-3">
            Module <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {phase0Modules.map(mod => {
              const isSelected = selectedModule?.id === mod.id
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setSelectedModule(mod)
                    setSelectedTemplate('')
                  }}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? MODULE_COLORS_SELECTED[mod.code] ?? 'border-konsol-accent ring-1 ring-konsol-accent/50'
                      : (MODULE_COLORS[mod.code] ?? 'border-konsol-600 bg-konsol-800 hover:border-konsol-500')
                  }`}
                >
                  <div className="mt-0.5">{MODULE_ICONS[mod.code] ?? <Package size={18} className="text-gray-400" />}</div>
                  <div>
                    <div className="text-white font-medium text-sm">{mod.code}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{mod.name}</div>
                  </div>
                  {isSelected && (
                    <div className="ml-auto">
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2 — Template (optional) */}
        {selectedModule && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Template <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <p className="text-gray-500 text-xs mb-3">Pre-defined phase & step structure for this module.</p>
            {availableTemplates.length === 0 ? (
              <div className="bg-konsol-800 border border-konsol-600 rounded-lg px-4 py-3 text-gray-500 text-sm">
                No templates yet for {selectedModule.code}. The shipment will start without a template.
              </div>
            ) : (
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-konsol-800 border border-konsol-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-konsol-accent focus:ring-1 focus:ring-konsol-accent/30 transition-colors"
              >
                <option value="">— No template —</option>
                {availableTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.is_default ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Step 3 — Details */}
        {selectedModule && (
          <>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Reference <span className="text-red-400">*</span>
              </label>
              <p className="text-gray-500 text-xs mb-2">Your internal shipment ID, BL number, or customs declaration ref.</p>
              <input
                type="text"
                required
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. SHP-2026-001 or BL-240123"
                className="w-full bg-konsol-800 border border-konsol-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-konsol-accent focus:ring-1 focus:ring-konsol-accent/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Description <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of goods, origin, or purpose…"
                className="w-full bg-konsol-800 border border-konsol-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-konsol-accent focus:ring-1 focus:ring-konsol-accent/30 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Counterparty <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <select
                  value={counterpartyId}
                  onChange={e => setCounterpartyId(e.target.value)}
                  className="w-full bg-konsol-800 border border-konsol-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-konsol-accent focus:ring-1 focus:ring-konsol-accent/30 transition-colors"
                >
                  <option value="">— Select —</option>
                  {stakeholders.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Due Date <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={dueAt}
                  onChange={e => setDueAt(e.target.value)}
                  className="w-full bg-konsol-800 border border-konsol-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-konsol-accent focus:ring-1 focus:ring-konsol-accent/30 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending || !reference.trim()}
                className="inline-flex items-center gap-2 bg-konsol-accent hover:bg-konsol-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Shipment'
                )}
              </button>
              <Link href="/shipments" className="text-gray-400 hover:text-white text-sm transition-colors">
                Cancel
              </Link>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

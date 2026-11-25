import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewShipmentForm from './NewShipmentForm'

export default async function NewShipmentPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user record (tenant_id)
  const { data: userRecord } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!userRecord?.tenant_id) redirect('/shipments')

  // Load modules (global)
  const { data: modules } = await supabase
    .from('modules')
    .select('id, code, name, direction, scope, is_active')
    .eq('is_active', true)
    .order('code')

  // Load templates for this tenant
  const { data: templates } = await supabase
    .from('templates')
    .select('id, name, module_id, is_default')
    .eq('tenant_id', userRecord.tenant_id)
    .eq('is_active', true)
    .order('name')

  // Load stakeholders (counterparties)
  const { data: stakeholders } = await supabase
    .from('stakeholders')
    .select('id, name, category, country_code')
    .eq('is_active', true)
    .order('name')

  return (
    <NewShipmentForm
      tenantId={userRecord.tenant_id}
      userId={user.id}
      modules={modules ?? []}
      templates={templates ?? []}
      stakeholders={stakeholders ?? []}
    />
  )
}

'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionResult } from '@/lib/types'

type Action = (form: FormData) => Promise<ActionResult>

export function ActionForm({ action, children, className, onSuccess, resetOnSuccess = false, confirm }: { action: Action; children: ReactNode; className?: string; onSuccess?: () => void; resetOnSuccess?: boolean; confirm?: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const router = useRouter()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirm && !window.confirm(confirm)) return
    const form = event.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const response = await action(formData)
      setResult(response)
      if (response.ok) {
        if (resetOnSuccess) form.reset()
        onSuccess?.()
        router.refresh()
      }
    })
  }

  return <form className={className} onSubmit={submit} aria-busy={pending}>{children}{result ? <p className={`session-message ${result.ok ? 'action-success' : 'action-error'}`} role={result.ok ? 'status' : 'alert'}>{result.message}</p> : null}{pending ? <p className="session-message" role="status">Enregistrement en cours…</p> : null}</form>
}

export function HiddenId({ id }: { id?: string }) {
  return id ? <input type="hidden" name="id" value={id} /> : null
}

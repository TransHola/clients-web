'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { RegisterForm } from '@/components/register-form'

export function AuthDialog({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'register',
  countryHint,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialMode?: 'register' | 'login' | 'reset'
  countryHint?: string
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-6 max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl rounded-3xl z-[9999]">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Your bus prices are one step away!
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Create your account or sign in to view guaranteed operator prices and save your quote.
          </DialogDescription>
        </DialogHeader>

        <RegisterForm
          embedded
          initialMode={initialMode}
          countryHint={countryHint}
          onAuthSuccess={() => {
            onSuccess()
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm'

export const metadata: Metadata = { title: 'Reset password' }

export default function ResetPasswordPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">We&apos;ll send you a reset link</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}

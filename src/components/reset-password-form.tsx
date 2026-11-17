'use client'

import { RegisterForm } from '@/components/register-form'

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <RegisterForm initialMode="reset" className={className} {...props} />
}

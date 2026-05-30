'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { resetPassword } from "@/app/actions/auth"
import { useActionState } from "react"
import Link from "next/link"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, action, pending] = useActionState(async (prevState: any, formData: FormData) => {
    return await resetPassword(formData)
  }, null)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state?.success ? (
            <div className="text-center p-4">
                <p className="text-sm text-green-600 mb-4">Password reset email sent! Check your inbox.</p>
                <Link href="/login" className="text-sm underline">Return to login</Link>
            </div>
          ) : (
            <form action={action}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                  />
                </Field>

                {state?.error && (
                  <div className="text-red-500 text-sm">{state.error}</div>
                )}

                <Field>
                  <Button type="submit" disabled={pending}>
                      {pending ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <FieldDescription className="text-center mt-2">
                    Remember your password? <Link href="/login" className="underline underline-offset-4">Login</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { updatePassword } from "@/app/actions/auth"
import { useActionState } from "react"

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, action, pending] = useActionState(async (prevState: any, formData: FormData) => {
    return await updatePassword(formData)
  }, null)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <form action={action}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="password">New Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </Field>

                {state?.error && (
                  <div className="text-red-500 text-sm">{state.error}</div>
                )}

                <Field>
                  <Button type="submit" disabled={pending}>
                      {pending ? "Updating..." : "Update Password"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
        </CardContent>
      </Card>
    </div>
  )
}

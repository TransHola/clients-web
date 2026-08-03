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
import { register } from "@/app/actions/auth"
import { useActionState, useState, useEffect } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PhoneInput, type Country } from "@transhola/ui"
import { Building2, Landmark, User, Eye, EyeOff } from "lucide-react"

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, action, pending] = useActionState(async (prevState: any, formData: FormData) => {
    return await register(formData)
  }, null)

  const [accountType, setAccountType] = useState("individual")
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState<string>("")
  const [defaultCountry, setDefaultCountry] = useState<Country>("US")

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        if (data && data.country_code) {
          setDefaultCountry(data.country_code as Country)
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Select your specific client category below to begin onboarding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={accountType} onValueChange={setAccountType} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 p-1 bg-muted/50">
              <TabsTrigger value="individual" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:shadow-sm">
                <User className="w-4 h-4" /> Individual
              </TabsTrigger>
              <TabsTrigger value="entity" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:shadow-sm">
                <Building2 className="w-4 h-4" /> Entity / B2B
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form action={action}>
            <input type="hidden" name="isCompany" value={accountType === 'entity' ? 'true' : 'false'} />
            <FieldGroup>
              {accountType === 'entity' && (
                <Field>
                  <FieldLabel htmlFor="entityName">Registered Entity Name</FieldLabel>
                  <Input id="entityName" name="entityName" placeholder="Acme Corp LLC" required={accountType === 'entity'} className="h-12 text-base" />
                </Field>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <Input id="firstName" name="firstName" placeholder="John" required className="h-12 text-base" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input id="lastName" name="lastName" placeholder="Doe" required className="h-12 text-base" />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                <input type="hidden" name="phone" value={phone} />
                <PhoneInput
                  id="phone"
                  placeholder="Enter phone number"
                  defaultCountry={defaultCountry}
                  value={phone}
                  onChange={setPhone as any}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  className="h-12 text-base"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    className="h-12 text-base pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </Field>

              {state?.error && (
                <div className="text-red-500 text-sm">{state.error}</div>
              )}

              <Field>
                <Button type="submit" disabled={pending}>
                    {pending ? "Registering..." : "Create Account"}
                </Button>
                <FieldDescription className="text-center mt-2">
                  Already have an account? <Link href="/login" className="underline underline-offset-4">Login</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

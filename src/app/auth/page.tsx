import { Metadata } from "next"
import Link from "next/link"
import { Building2, Check, User, ChevronRight, Landmark } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = {
  title: "Client Registration | TRANSHOLA",
  description: "Create a TRANSHOLA Client Account",
}

export default function AuthenticationPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      
      {/* Left Splash/Marketing Column */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-brand-blue" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
        <div className="relative z-20 flex items-center gap-2 text-xl font-black tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-brand-blue shadow-inner">
             <span className="font-extrabold text-sm tracking-tighter">TR</span>
          </div>
          TRANSHOLA Client
        </div>
        
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-6">
            <h1 className="text-4xl font-black leading-tight">Enterprise mobility infrastructure, simplified.</h1>
            <ul className="space-y-3 font-medium text-white/80">
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> Multi-tiered B2B User Hierarchy</li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> Premium Booking Lifecycle Engine</li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> Automated Quotations & Cost Mapping</li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> Secure Escrow Payment Controls</li>
            </ul>
          </blockquote>
        </div>
      </div>

      {/* Right Registration Column */}
      <div className="lg:p-8 overflow-y-auto">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px] py-12">
          
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-black tracking-tight">Create an account</h1>
            <p className="text-sm font-medium text-muted-foreground max-w-[300px] mx-auto">
              Select your specific client category below to begin onboarding.
            </p>
          </div>

          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl h-14 p-1 bg-muted/50">
              <TabsTrigger value="individual" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:shadow-sm">
                <User className="w-4 h-4" /> Individual
              </TabsTrigger>
              <TabsTrigger value="entity" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:shadow-sm">
                <Building2 className="w-4 h-4" /> Entity
              </TabsTrigger>
              <TabsTrigger value="government" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:shadow-sm">
                <Landmark className="w-4 h-4" /> Gov
              </TabsTrigger>
            </TabsList>
            
            {/* 1. INDIVIDUAL REGISTRATION */}
            <TabsContent value="individual" className="space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" className="rounded-xl h-12 bg-muted/30 focus:bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" className="rounded-xl h-12 bg-muted/30 focus:bg-background" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" className="rounded-xl h-12 bg-muted/30 focus:bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" className="rounded-xl h-12 bg-muted/30 focus:bg-background" />
              </div>
              <Button className="w-full h-12 rounded-xl text-base font-bold bg-brand-blue hover:bg-brand-blue/90 text-white shadow-xl mt-4">
                Register Personal Account <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </TabsContent>

            {/* 2. ENTITY (B2B) REGISTRATION */}
            <TabsContent value="entity" className="space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <Label htmlFor="entityName">Registered Entity Name</Label>
                <Input id="entityName" placeholder="Acme Corp LLC" className="rounded-xl h-12 bg-muted/30 focus:bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / VAT No.</Label>
                  <Input id="taxId" placeholder="12-345678" className="rounded-xl h-12 bg-muted/30 focus:bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Commercial Reg.</Label>
                  <Input id="registrationNumber" placeholder="CR-998877" className="rounded-xl h-12 bg-muted/30 focus:bg-background" />
                </div>
              </div>
              <div className="space-y-2 border-t pt-4 mt-2">
                <Label htmlFor="adminEmail">Organization Admin Email</Label>
                <Input id="adminEmail" type="email" placeholder="admin@acmecorp.com" className="rounded-xl h-12 bg-muted/30 focus:bg-background" />
                <p className="text-[10px] text-muted-foreground mt-1 px-1">Must be an official company domain.</p>
              </div>
              <Button className="w-full h-12 rounded-xl text-base font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 dark:text-slate-900 text-white shadow-xl mt-4 group">
                Submit B2B Application
              </Button>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 mt-4">
                 <Building2 className="w-5 h-5 text-amber-600 shrink-0" />
                 <p className="text-xs text-amber-700/80 dark:text-amber-400 font-medium leading-tight">
                   Corporate accounts require manual Super Admin verification before enabling multi-tenant RBAC and invoicing access.
                 </p>
              </div>
            </TabsContent>

            {/* 3. GOVERNMENT (B2G) REGISTRATION */}
            <TabsContent value="government" className="space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <Label htmlFor="agencyName">Government Agency / Ministry</Label>
                <Input id="agencyName" placeholder="Ministry of Transportation" className="rounded-xl h-12 bg-muted/30 focus:bg-background border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departmentCode">Department (Optional)</Label>
                  <Input id="departmentCode" placeholder="Logistics Div." className="rounded-xl h-12 bg-muted/30 focus:bg-background border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="govId">Official Gov ID Code</Label>
                  <Input id="govId" placeholder="GOV-9012" className="rounded-xl h-12 bg-muted/30 focus:bg-background border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="space-y-2 border-t pt-4 mt-2">
                <Label htmlFor="govAdminEmail">Authorizing Official Email</Label>
                <Input id="govAdminEmail" type="email" placeholder="director@gov.us" className="rounded-xl h-12 bg-muted/30 focus:bg-background border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500" />
              </div>
              <Button className="w-full h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/10 mt-4 group">
                Initiate Secure Onboarding
              </Button>
              <p className="text-[10px] text-center text-muted-foreground font-medium px-4 leading-tight mt-4">
                Government (B2G) accounts utilize PO-based rigid billing options and execute under secure, strict compliance SLA bounds.
              </p>
            </TabsContent>
            
          </Tabs>
          
          <p className="px-8 text-center text-xs text-muted-foreground pt-4 border-t">
            By clicking continue, you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4 font-bold hover:text-primary">
              Policy Escrow
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4 font-bold hover:text-primary">
              Terms of Resolution
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Camera, Shield, Lock, Smartphone, Download, Trash2, Bell, Globe, Moon, Eye, EyeOff, AlertTriangle } from "lucide-react"

export default function ProfilePage() {
  const [showCurrentPw, setShowCurrentPw] = React.useState(false)
  const [showNewPw, setShowNewPw] = React.useState(false)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-[#0f172a]">My Profile</h1>
        <p className="text-[15px] text-muted-foreground mt-2 font-medium">Manage your personal account settings.</p>
      </div>

      <Tabs defaultValue="personal" className="w-full flex flex-col">
        <div className="mb-6">
          <TabsList className="inline-flex w-auto bg-muted/50 rounded-xl h-11 p-1">
            <TabsTrigger value="personal" className="rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">Personal Info</TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">Security</TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">Privacy</TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">Preferences</TabsTrigger>
          </TabsList>
        </div>

        {/* Personal Info */}
        <TabsContent value="personal" className="m-0">
          <div className="rounded-2xl border bg-card p-6 space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-black">GT</AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <div>
                <p className="font-bold text-base">Global Tech Solutions</p>
                <p className="text-sm text-muted-foreground">logistics@globaltech.com</p>
                <p className="text-xs text-muted-foreground mt-1">Corporate Account · Member since Jan 2024</p>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">First Name</label>
                <Input defaultValue="Global" className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Last Name</label>
                <Input defaultValue="Tech" className="h-11 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Email Address</label>
              <Input defaultValue="logistics@globaltech.com" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Phone Number</label>
              <Input defaultValue="+971 4 123 4567" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Company / Entity</label>
              <Input defaultValue="Global Tech Solutions LLC" className="h-11 rounded-xl" />
            </div>

            <Button className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="m-0">
          <div className="space-y-4">
            {/* Change Password */}
            <div className="rounded-2xl border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm">Change Password</h3>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Current Password</label>
                <div className="relative">
                  <Input type={showCurrentPw ? "text" : "password"} placeholder="Enter current password" className="h-11 rounded-xl pr-10" />
                  <button tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">New Password</label>
                <div className="relative">
                  <Input type={showNewPw ? "text" : "password"} placeholder="Min. 8 characters" className="h-11 rounded-xl pr-10" />
                  <button tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPw(!showNewPw)}>
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">Update Password</Button>
            </div>

            {/* 2FA */}
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of account security</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-lg font-bold text-xs h-8">Enable 2FA</Button>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm">Active Sessions</h3>
              </div>
              {[
                { device: "MacBook Pro · Chrome 122", location: "Dubai, UAE", time: "Current session", isCurrent: true },
                { device: "iPhone 15 Pro · Safari", location: "Abu Dhabi, UAE", time: "2 hours ago", isCurrent: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-bold">{s.device}</p>
                    <p className="text-xs text-muted-foreground">{s.location} · {s.time}</p>
                  </div>
                  {s.isCurrent ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Active</span>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50 rounded-lg h-7 text-xs font-bold">Revoke</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Privacy */}
        <TabsContent value="privacy" className="m-0">
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-6 space-y-4">
              <h3 className="font-bold text-sm">Your Data</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                TRANSHOLA collects trip data and location history to improve your booking experience. You have full control over your data.
              </p>
              <Button variant="outline" className="w-full rounded-xl h-11 font-bold gap-2">
                <Download className="w-4 h-4" /> Export My Data (GDPR)
              </Button>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-sm text-rose-700">Danger Zone</h3>
              </div>
              <p className="text-xs text-rose-600 leading-relaxed">
                Deleting your account is permanent and cannot be undone. All your trip history, invoices, and saved data will be permanently removed.
              </p>
              <Button variant="outline" className="w-full rounded-xl h-11 font-bold text-rose-600 border-rose-300 hover:bg-rose-100 gap-2">
                <Trash2 className="w-4 h-4" /> Delete My Account
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="m-0">
          <div className="rounded-2xl border bg-card p-6 space-y-5">
            {[
              { icon: Bell, label: "Push Notifications", desc: "Booking confirmations and driver alerts", defaultVal: true },
              { icon: Bell, label: "Email Notifications", desc: "Invoices and account updates", defaultVal: true },
              { icon: Moon, label: "Dark Mode", desc: "Switch interface to dark theme", defaultVal: false },
              { icon: Globe, label: "Language", desc: "English (US)", defaultVal: null },
            ].map((pref, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
                    <pref.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                </div>
                {pref.defaultVal !== null ? (
                  <ToggleSwitch defaultOn={pref.defaultVal} />
                ) : (
                  <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs font-bold">Change</Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ToggleSwitch({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = React.useState(defaultOn)
  return (
    <button
      onClick={() => setOn(!on)}
      className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${on ? "bg-blue-600" : "bg-muted"}`}
    >
      <span className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform duration-200 ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}

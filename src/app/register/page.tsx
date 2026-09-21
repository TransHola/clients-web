import { RegisterForm } from "@/components/register-form"
import { Compass, ShieldCheck, Star, Sparkles, Car, Clock, CreditCard } from "lucide-react"

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020817] flex items-stretch relative overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Split Container */}
            <div className="flex w-full min-h-screen z-10">
                {/* Left Panel: VIP Value Proposition & Corporate Perks */}
                <div className="hidden lg:flex flex-col justify-between flex-[1.1] p-12 lg:p-16 relative border-r border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-[#020817]/40 backdrop-blur-3xl">
                    {/* Top Branding */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10">
                            <Compass size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                                TransHola <span className="text-blue-600 dark:text-blue-400 font-semibold">Clients</span>
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                                Global Mobility Platform
                            </span>
                        </div>
                    </div>

                    {/* Middle Value Proposition */}
                    <div className="max-w-xl my-auto py-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-xs font-bold text-blue-600 dark:text-blue-400 mb-6">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Private & Corporate Travel</span>
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 tracking-tight leading-[1.15] mb-6">
                            Seamless Luxury. Direct Access.
                        </h1>

                        <p className="text-base lg:text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-lg">
                            Register your TransHola client account to reserve premier chauffeured vehicles, coordinate executive itineraries, and manage corporate business invoicing with total transparency.
                        </p>

                        {/* Feature Pillars */}
                        <div className="space-y-4 mb-10">
                            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                    <Car className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Handpicked Executive Fleet</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Mercedes S-Class, V-Class, and luxury coaches maintained to rigorous standards.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Punctuality & Flight Tracking</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Real-time airport flight monitoring with automated buffer times and zero-delay pickups.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Centralized Billing & VAT Invoicing</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Consolidated monthly invoices, instant digital receipts, and transparent all-inclusive fares.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Social Proof / Metrics */}
                        <div className="flex items-center gap-8 pt-4 border-t border-slate-200/80 dark:border-slate-800/60">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <ShieldCheck className="text-emerald-500" size={18} />
                                    <span className="text-xl font-bold text-slate-900 dark:text-white">100%</span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Verified Drivers</span>
                            </div>
                            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <Star className="text-amber-500" size={18} />
                                    <span className="text-xl font-bold text-slate-900 dark:text-white">4.9 / 5</span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Client Satisfaction</span>
                            </div>
                            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-slate-900 dark:text-white">99.8%</span>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">On-Time Pickups</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-xs text-slate-400 font-medium">
                        &copy; {new Date().getFullYear()} TransHola International. All rights reserved.
                    </div>
                </div>

                {/* Right Panel: The Modern Form */}
                <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
                    <div className="w-full max-w-[520px] my-auto py-6">
                        <RegisterForm />
                    </div>
                </div>
            </div>
        </div>
    )
}

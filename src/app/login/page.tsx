import { LoginForm } from "@/components/login-form"
import { Compass, MapPin, ShieldCheck, Star } from "lucide-react"

export default function Page() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#020817] flex items-stretch relative overflow-hidden font-sans">
            {/* Elegant Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Split Container */}
            <div className="flex w-full min-h-screen z-10">
                {/* Left Panel: Corporate Branding & Value Prop */}
                <div className="hidden lg:flex flex-col justify-between flex-[1.2] p-12 lg:p-16 relative border-r border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-[#020817]/40 backdrop-blur-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-1 ring-slate-900/5 dark:ring-white/10">
                            <Compass size={20} strokeWidth={2.5} />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">TransHola <span className="text-blue-600 dark:text-blue-500 font-medium">Clients</span></span>
                    </div>

                    <div className="max-w-xl my-auto">
                        <h1 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight leading-[1.15] mb-6">
                            Elevate Your Journey.
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-12 max-w-md">
                            Experience premium transportation with professional chauffeurs, real-time tracking, and uncompromising safety standards. Your destination, our priority.
                        </p>

                        <div className="flex items-center gap-8">
                            <div className="flex flex-col gap-1">
                                <ShieldCheck className="text-emerald-500 mb-1" size={24} />
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-200">100%</span>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Secure Rides</span>
                            </div>
                            <div className="w-px h-12 bg-slate-300 dark:bg-slate-800" />
                            <div className="flex flex-col gap-1">
                                <Star className="text-amber-500 mb-1" size={24} />
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-200">4.9/5</span>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Rating</span>
                            </div>
                            <div className="w-px h-12 bg-slate-300 dark:bg-slate-800" />
                            <div className="flex flex-col gap-1">
                                <MapPin className="text-blue-500 mb-1" size={24} />
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-200">Global</span>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Coverage</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-slate-500 font-medium">
                        &copy; {new Date().getFullYear()} TransHola Inc.
                    </div>
                </div>

                {/* Right Panel: Login Form */}
                <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-white/60 dark:bg-[#020817]/60 backdrop-blur-xl">
                    <div className="w-full max-w-[400px]">
                        <LoginForm />
                    </div>
                </div>
            </div>
        </div>
    )
}

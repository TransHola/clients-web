'use client'

import { useState, useEffect } from "react"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp } from "@/app/actions/auth"
import { Mail, Smartphone, CheckCircle2, AlertCircle } from "lucide-react"

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const email = searchParams.get('email') || ''
  const phone = searchParams.get('phone') || ''
  
  const [step, setStep] = useState(1) // 1: Email, 2: Phone, 3: Success
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  useEffect(() => {
    if (!email || !phone) {
      router.push('/register')
    }
  }, [email, phone, router])

  const handleVerifyEmail = async () => {
    if (otp.length < 6) return
    setLoading(true)
    setError("")
    
    const res = await verifyEmailOtp(email, otp)
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    
    // Email verified successfully, trigger phone OTP
    const phoneRes = await sendPhoneOtp()
    if (phoneRes.error) {
      setError(phoneRes.error) // Wait, if it fails, we still go to step 2 to let them retry? Yes.
    }
    
    setOtp("")
    setStep(2)
    setLoading(false)
  }

  const handleVerifyPhone = async () => {
    if (otp.length < 6) return
    setLoading(true)
    setError("")
    
    const res = await verifyPhoneOtp(phone, otp)
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    
    setStep(3)
    setLoading(false)
    setTimeout(() => {
      router.push('/profile')
    }, 2000)
  }

  const handleResendPhone = async () => {
    setLoading(true)
    setError("")
    const phoneRes = await sendPhoneOtp()
    if (phoneRes.error) setError(phoneRes.error)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            {step === 1 && <Mail className="w-6 h-6 text-blue-600" />}
            {step === 2 && <Smartphone className="w-6 h-6 text-blue-600" />}
            {step === 3 && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && "Verify your email"}
            {step === 2 && "Verify your phone"}
            {step === 3 && "Verification Complete"}
          </CardTitle>
          <CardDescription className="text-base">
            {step === 1 && <>We sent a 6-digit code to <strong>{email}</strong></>}
            {step === 2 && <>We sent an SMS code via Twilio to <strong>{phone}</strong></>}
            {step === 3 && "Securing your session and redirecting to your dashboard..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg w-full text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          {step < 3 && (
            <div className="flex flex-col items-center gap-6 w-full">
              <InputOTP 
                maxLength={6} 
                value={otp} 
                onChange={setOtp}
                disabled={loading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <Button 
                onClick={step === 1 ? handleVerifyEmail : handleVerifyPhone}
                disabled={otp.length < 6 || loading}
                className="w-full h-12 text-base font-bold"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
              
              {step === 2 && (
                <button 
                  onClick={handleResendPhone}
                  disabled={loading}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium underline underline-offset-4"
                >
                  Didn't receive SMS? Resend
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  )
}

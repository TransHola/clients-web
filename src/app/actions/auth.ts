'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/profile')
}

export async function register(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  // Custom fields
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const entityName = formData.get('entityName') as string
  const isCompany = formData.get('isCompany') === 'true'

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        company_name: entityName,
        is_company: isCompany
      }
    }
  })

  if (error) {
    return { error: error.message }
  }
  
  // NOTE: We insert the profile directly into the 'profiles' table.
  if (data.user) {
      await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName || null,
          last_name: lastName || null,
          role: 'client',
          status: 'Active',
          preferences: {
            clientType: isCompany ? 'Corporate' : 'Individual',
            companyName: entityName || null
          }
      })
  }

  revalidatePath('/', 'layout')
  redirect('/profile')
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  const supabase = await createClient()

  // The reset-password URL should point to a route that handles the token exchange and shows the "Update Password" form
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8083'}/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
    const password = formData.get('password') as string
  
    const supabase = await createClient()
  
    const { error } = await supabase.auth.updateUser({
      password: password
    })
  
    if (error) {
      return { error: error.message }
    }
  
    redirect('/profile')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

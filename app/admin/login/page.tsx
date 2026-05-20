'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setErrorMsg('')
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/admin/photos')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF7F2] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-xl border border-[#F0D6D3]">
        <div className="mb-6 text-center">
          <p className="text-sm tracking-[0.25em] uppercase text-[#B76E79] font-semibold">
            Admin Panel
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#7A2E3A]">
            Giriş Yap
          </h1>

          <p className="mt-2 text-sm text-[#6F5B5D]">
            Yüklenen düğün fotoğraflarını görüntülemek için giriş yapın.
          </p>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={isLoading}
          className="mb-3 w-full rounded-xl border border-[#E8C7C8] bg-[#FFFDFB] px-4 py-3 text-[#3D2C2E] placeholder:text-[#A98B8E] outline-none transition focus:border-[#B76E79] focus:ring-2 focus:ring-[#F3D7D8] disabled:bg-[#F8F0EE]"
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isLoading}
          className="mb-4 w-full rounded-xl border border-[#E8C7C8] bg-[#FFFDFB] px-4 py-3 text-[#3D2C2E] placeholder:text-[#A98B8E] outline-none transition focus:border-[#B76E79] focus:ring-2 focus:ring-[#F3D7D8] disabled:bg-[#F8F0EE]"
        />

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full rounded-xl bg-[#B76E79] py-3 font-semibold text-white shadow-md transition hover:bg-[#9F5965] disabled:cursor-not-allowed disabled:bg-[#CDB8BA]"
        >
          {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>

        {errorMsg && (
          <p className="mt-4 rounded-xl border border-[#F2B8B5] bg-[#FFF1F0] px-4 py-3 text-center text-sm font-medium text-[#9B2C2C]">
            {errorMsg}
          </p>
        )}

        <div className="mt-5 border-t border-[#F0D6D3] pt-4 text-center">
          <Link
            href="/upload"
            className="inline-flex w-full items-center justify-center rounded-xl border border-[#B76E79] bg-white px-4 py-3 text-sm font-semibold text-[#7A2E3A] transition hover:bg-[#FFF1ED]"
          >
            Fotoğraf Yükleme Sayfasına Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
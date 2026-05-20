'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.push('/upload') // root’a gidince direkt upload sayfasına yönlendir
  }, [])
  return null
}
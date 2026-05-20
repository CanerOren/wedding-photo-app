'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Photo = {
  id: string
  file_path: string
  guest_name: string | null
  message: string | null
  file_size?: number | null
  mime_type?: string | null
  created_at: string
}

export default function AdminPhotos() {
  const router = useRouter()
  const didFetchInitialPhotos = useRef(false)

  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  const perPage = 20

  const selectedPhoto =
    selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null

  const getPhotoUrl = (filePath: string) => {
    const cleanPath = filePath.replace(/^\/+/, '')

    const { data } = supabase.storage
      .from('wedding-photos')
      .getPublicUrl(cleanPath)

    return data.publicUrl
  }

  const fetchPhotos = async (pageToFetch: number) => {
    if (loading) return
    if (!hasMore && pageToFetch !== 1) return

    setLoading(true)
    setErrorMsg('')

    try {
      const from = (pageToFetch - 1) * perPage
      const to = pageToFetch * perPage - 1

      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error(error)
        setErrorMsg(error.message)
        return
      }

      if (data) {
        const incomingPhotos = data as Photo[]

        setPhotos(prev => {
          if (pageToFetch === 1) {
            return incomingPhotos
          }

          const existingIds = new Set(prev.map(photo => photo.id))

          const uniqueIncomingPhotos = incomingPhotos.filter(
            photo => !existingIds.has(photo.id)
          )

          return [...prev, ...uniqueIncomingPhotos]
        })

        if (incomingPhotos.length < perPage) {
          setHasMore(false)
        } else {
          setHasMore(true)
        }

        setPage(pageToFetch + 1)
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Bilinmeyen bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const openPhoto = (index: number) => {
    setSelectedPhotoIndex(index)
  }

  const closePhoto = () => {
    setSelectedPhotoIndex(null)
  }

  const showPreviousPhoto = () => {
    setSelectedPhotoIndex(prev => {
      if (prev === null) return null
      if (photos.length === 0) return null

      return prev === 0 ? photos.length - 1 : prev - 1
    })
  }

  const showNextPhoto = () => {
    setSelectedPhotoIndex(prev => {
      if (prev === null) return null
      if (photos.length === 0) return null

      return prev === photos.length - 1 ? 0 : prev + 1
    })
  }

  useEffect(() => {
    const checkSessionAndFetch = async () => {
      if (didFetchInitialPhotos.current) return
      didFetchInitialPhotos.current = true

      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.push('/admin/login')
        return
      }

      await fetchPhotos(1)
      setInitialLoading(false)
    }

    checkSessionAndFetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedPhotoIndex === null) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePhoto()
      }

      if (event.key === 'ArrowLeft') {
        showPreviousPhoto()
      }

      if (event.key === 'ArrowRight') {
        showNextPhoto()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhotoIndex, photos.length])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7F2]">
        <p className="rounded-xl bg-white px-5 py-3 text-[#5A4245] shadow-md border border-[#F0D6D3]">
          Yükleniyor...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF7F2] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-2xl border border-[#F0D6D3] bg-white/95 p-5 shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm tracking-[0.25em] uppercase text-[#B76E79] font-semibold">
                Wedding Gallery
              </p>

              <h1 className="mt-1 text-3xl font-bold text-[#7A2E3A]">
                Yüklenen Fotoğraflar
              </h1>

              <p className="mt-1 text-sm text-[#6F5B5D]">
                Misafirlerin yüklediği tüm fotoğrafları buradan görüntüleyebilirsiniz.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-[#5A4245] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#3D2C2E]"
            >
              Çıkış Yap
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="mb-4 rounded-xl border border-[#F2B8B5] bg-[#FFF1F0] px-4 py-3 text-center text-sm font-medium text-[#9B2C2C]">
            Hata: {errorMsg}
          </p>
        )}

        {photos.length === 0 && !loading && !errorMsg && (
          <p className="rounded-xl border border-[#F0D6D3] bg-white px-4 py-6 text-center text-[#6F5B5D] shadow-sm">
            Henüz fotoğraf yüklenmemiş.
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => openPhoto(index)}
              className="group overflow-hidden rounded-2xl border border-[#F0D6D3] bg-white text-left shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="overflow-hidden bg-[#FFF1ED]">
                <img
                  src={getPhotoUrl(photo.file_path)}
                  alt={photo.guest_name || 'Fotoğraf'}
                  className="h-52 w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>

              <div className="p-4">
                {photo.guest_name ? (
                  <p className="font-semibold text-[#4A3437]">
                    {photo.guest_name}
                  </p>
                ) : (
                  <p className="font-semibold text-[#9B7A7E]">
                    İsimsiz misafir
                  </p>
                )}

                {photo.message && (
                  <p className="mt-1 line-clamp-2 text-sm text-[#6F5B5D]">
                    {photo.message}
                  </p>
                )}

                {photo.created_at && (
                  <p className="mt-3 text-xs text-[#9B7A7E]">
                    {new Date(photo.created_at).toLocaleString('tr-TR')}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {hasMore && photos.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => fetchPhotos(page)}
              className="rounded-xl bg-[#B76E79] px-6 py-3 font-semibold text-white shadow-md transition hover:bg-[#9F5965] disabled:cursor-not-allowed disabled:bg-[#CDB8BA]"
              disabled={loading}
            >
              {loading ? 'Yükleniyor...' : 'Daha Fazla Fotoğraf'}
            </button>
          </div>
        )}
      </div>

      {selectedPhoto && selectedPhotoIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1718]/95 p-4">
          <button
            type="button"
            onClick={closePhoto}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-4xl leading-none text-white transition hover:bg-white/25"
            aria-label="Fotoğrafı kapat"
          >
            ×
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={showPreviousPhoto}
              className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-4xl text-white transition hover:bg-white/25"
              aria-label="Önceki fotoğraf"
            >
              ‹
            </button>
          )}

          <div className="flex w-full max-w-6xl flex-col items-center">
            <img
              src={getPhotoUrl(selectedPhoto.file_path)}
              alt={selectedPhoto.guest_name || 'Fotoğraf'}
              className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />

            <div className="mt-4 max-w-2xl rounded-2xl bg-white/10 px-5 py-4 text-center text-white backdrop-blur">
              <p className="mb-1 text-sm text-[#F5D9D6]">
                {selectedPhotoIndex + 1} / {photos.length}
              </p>

              {selectedPhoto.guest_name && (
                <p className="text-lg font-semibold text-white">
                  {selectedPhoto.guest_name}
                </p>
              )}

              {selectedPhoto.message && (
                <p className="mt-1 text-sm text-[#FCEDEA]">
                  {selectedPhoto.message}
                </p>
              )}

              {selectedPhoto.created_at && (
                <p className="mt-2 text-xs text-[#EBC7C4]">
                  {new Date(selectedPhoto.created_at).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={showNextPhoto}
              className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-4xl text-white transition hover:bg-white/25"
              aria-label="Sonraki fotoğraf"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}
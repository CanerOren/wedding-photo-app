'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isBulkDownloading, setIsBulkDownloading] = useState(false)
  const [bulkDownloadStatus, setBulkDownloadStatus] = useState('')

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

  const isVideoMedia = (photo: Photo) => {
    const mimeType = photo.mime_type?.toLowerCase() || ''
    const filePath = photo.file_path.toLowerCase()

    return (
      mimeType.startsWith('video/') ||
      filePath.endsWith('.mp4') ||
      filePath.endsWith('.mov') ||
      filePath.endsWith('.m4v') ||
      filePath.endsWith('.webm') ||
      filePath.endsWith('.avi') ||
      filePath.endsWith('.mkv')
    )
  }

  const getMediaLabel = (photo: Photo) => {
    return isVideoMedia(photo) ? 'Video' : 'Fotoğraf'
  }

  const getDownloadFileName = (photo: Photo) => {
    const fileNameFromPath = photo.file_path.split('/').pop()

    if (fileNameFromPath) {
      return fileNameFromPath
    }

    return `wedding-media-${photo.id}`
  }

  const handleDownloadPhoto = async (
    photo: Photo,
    event?: MouseEvent<HTMLButtonElement>
  ) => {
    event?.stopPropagation()

    setDownloadingId(photo.id)
    setErrorMsg('')

    try {
      const photoUrl = getPhotoUrl(photo.file_path)
      const response = await fetch(photoUrl)

      if (!response.ok) {
        throw new Error('Medya indirilemedi.')
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = getDownloadFileName(photo)

      document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(blobUrl)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Medya indirilirken bir hata oluştu.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleBulkDownload = async () => {
    if (photos.length === 0) {
      setErrorMsg('İndirilecek medya bulunamadı.')
      return
    }

    setIsBulkDownloading(true)
    setBulkDownloadStatus('')
    setErrorMsg('')

    try {
      const zip = new JSZip()

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        const photoUrl = getPhotoUrl(photo.file_path)

        setBulkDownloadStatus(`${i + 1}/${photos.length} medya ZIP dosyasına ekleniyor...`)

        const response = await fetch(photoUrl)

        if (!response.ok) {
          throw new Error(`${i + 1}. medya indirilemedi.`)
        }

        const blob = await response.blob()
        const fileName = getDownloadFileName(photo)

        zip.file(`${i + 1}-${fileName}`, blob)
      }

      setBulkDownloadStatus('ZIP dosyası hazırlanıyor...')

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipUrl = URL.createObjectURL(zipBlob)

      const link = document.createElement('a')
      link.href = zipUrl
      link.download = `wedding-media-${new Date().toISOString().slice(0, 10)}.zip`

      document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(zipUrl)

      setBulkDownloadStatus('ZIP dosyası indirildi.')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Toplu indirme sırasında hata oluştu.')
      setBulkDownloadStatus('')
    } finally {
      setIsBulkDownloading(false)
    }
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
      setErrorMsg(err.message || 'Bilinmeyen bir hata oluştu.')
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

  const handleDeletePhoto = async (
    photo: Photo,
    photoIndex: number,
    event?: MouseEvent<HTMLButtonElement>
  ) => {
    event?.stopPropagation()

    const confirmed = window.confirm(
      'Bu medyayı silmek istediğine emin misin? Bu işlem geri alınamaz.'
    )

    if (!confirmed) return

    setDeletingId(photo.id)
    setErrorMsg('')

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) {
        router.push('/admin/login')
        return
      }

      const res = await fetch('/api/photos/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: photo.id,
        }),
      })

      const responseText = await res.text()

      let result: any = null

      try {
        result = responseText ? JSON.parse(responseText) : {}
      } catch {
        console.error('API JSON dönmedi. Gelen cevap:', responseText)

        setErrorMsg(
          `API JSON dönmedi. Status: ${res.status}. /api/photos/delete route tarafını kontrol et.`
        )
        return
      }

      if (!res.ok || result?.error) {
        setErrorMsg(result?.error || 'Medya silinirken hata oluştu.')
        return
      }

      setPhotos(prev => prev.filter(item => item.id !== photo.id))

      setSelectedPhotoIndex(prev => {
        if (prev === null) return null

        if (prev === photoIndex) {
          return null
        }

        if (photoIndex < prev) {
          return prev - 1
        }

        return prev
      })
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Medya silinirken bilinmeyen bir hata oluştu.')
    } finally {
      setDeletingId(null)
    }
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
                Yüklenen Fotoğraf ve Videolar
              </h1>

              <p className="mt-1 text-sm text-[#6F5B5D]">
                Misafirlerin yüklediği tüm fotoğraf ve videoları buradan görüntüleyebilirsiniz.
              </p>

              {photos.length > 0 && (
                <p className="mt-2 text-sm font-medium text-[#7A2E3A]">
                  Şu anda {photos.length} medya yüklendi.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleBulkDownload}
                disabled={photos.length === 0 || isBulkDownloading}
                className="rounded-xl border border-[#B76E79] bg-white px-5 py-3 font-semibold text-[#7A2E3A] shadow-sm transition hover:bg-[#FFF1ED] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBulkDownloading ? 'ZIP Hazırlanıyor...' : 'Tüm Medyayı ZIP İndir'}
              </button>

              <button
                onClick={handleLogout}
                className="rounded-xl bg-[#5A4245] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#3D2C2E]"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>

        {bulkDownloadStatus && (
          <p className="mb-4 rounded-xl border border-[#F0D6D3] bg-white px-4 py-3 text-center text-sm font-medium text-[#5A4245]">
            {bulkDownloadStatus}
          </p>
        )}

        {errorMsg && (
          <p className="mb-4 rounded-xl border border-[#F2B8B5] bg-[#FFF1F0] px-4 py-3 text-center text-sm font-medium text-[#9B2C2C]">
            Hata: {errorMsg}
          </p>
        )}

        {photos.length === 0 && !loading && !errorMsg && (
          <p className="rounded-xl border border-[#F0D6D3] bg-white px-4 py-6 text-center text-[#6F5B5D] shadow-sm">
            Henüz fotoğraf veya video yüklenmemiş.
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group overflow-hidden rounded-2xl border border-[#F0D6D3] bg-white text-left shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <button
                type="button"
                onClick={() => openPhoto(index)}
                className="block w-full text-left"
              >
                <div className="overflow-hidden bg-[#FFF1ED]">
                  {isVideoMedia(photo) ? (
                    <div className="relative">
                      <video
                        src={getPhotoUrl(photo.file_path)}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-52 w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#7A2E3A] shadow">
                          ▶ Video
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={getPhotoUrl(photo.file_path)}
                      alt={photo.guest_name || 'Fotoğraf'}
                      className="h-52 w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                </div>

                <div className="p-4">
                  <p className="mb-2 inline-flex rounded-full bg-[#FFF1ED] px-3 py-1 text-xs font-semibold text-[#7A2E3A]">
                    {getMediaLabel(photo)}
                  </p>

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

              <div className="space-y-2 px-4 pb-4">
                <button
                  type="button"
                  onClick={event => handleDownloadPhoto(photo, event)}
                  disabled={downloadingId === photo.id}
                  className="w-full rounded-xl border border-[#B76E79] bg-white px-4 py-2 text-sm font-semibold text-[#7A2E3A] transition hover:bg-[#FFF1ED] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloadingId === photo.id ? 'İndiriliyor...' : 'Medyayı İndir'}
                </button>

                <button
                  type="button"
                  onClick={event => handleDeletePhoto(photo, index, event)}
                  disabled={deletingId === photo.id}
                  className="w-full rounded-xl border border-[#D45B5B] bg-white px-4 py-2 text-sm font-semibold text-[#B42323] transition hover:bg-[#FFF1F0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === photo.id ? 'Siliniyor...' : 'Medyayı Sil'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {hasMore && photos.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => fetchPhotos(page)}
              className="rounded-xl bg-[#B76E79] px-6 py-3 font-semibold text-white shadow-md transition hover:bg-[#9F5965] disabled:cursor-not-allowed disabled:bg-[#CDB8BA]"
              disabled={loading}
            >
              {loading ? 'Yükleniyor...' : 'Daha Fazla Medya'}
            </button>
          </div>
        )}
      </div>

      {selectedPhoto && selectedPhotoIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1718]/95 p-4">
          <button
            type="button"
            onClick={closePhoto}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-4xl leading-none text-white transition hover:bg-white/25"
            aria-label="Medyayı kapat"
          >
            ×
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={showPreviousPhoto}
              className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-4xl text-white transition hover:bg-white/25"
              aria-label="Önceki medya"
            >
              ‹
            </button>
          )}

          <div className="flex w-full max-w-6xl flex-col items-center">
            {isVideoMedia(selectedPhoto) ? (
              <video
                key={selectedPhoto.file_path}
                src={getPhotoUrl(selectedPhoto.file_path)}
                controls
                playsInline
                className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <img
                src={getPhotoUrl(selectedPhoto.file_path)}
                alt={selectedPhoto.guest_name || 'Fotoğraf'}
                className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            )}

            <div className="mt-4 max-w-2xl rounded-2xl bg-white/10 px-5 py-4 text-center text-white backdrop-blur">
              <p className="mb-1 text-sm text-[#F5D9D6]">
                {selectedPhotoIndex + 1} / {photos.length} · {getMediaLabel(selectedPhoto)}
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

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => handleDownloadPhoto(selectedPhoto)}
                  disabled={downloadingId === selectedPhoto.id}
                  className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-[#7A2E3A] transition hover:bg-[#FFF1ED] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloadingId === selectedPhoto.id ? 'İndiriliyor...' : 'Medyayı İndir'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeletePhoto(selectedPhoto, selectedPhotoIndex)}
                  disabled={deletingId === selectedPhoto.id}
                  className="rounded-xl bg-[#B42323] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#8F1D1D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === selectedPhoto.id ? 'Siliniyor...' : 'Bu Medyayı Sil'}
                </button>
              </div>
            </div>
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={showNextPhoto}
              className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-4xl text-white transition hover:bg-white/25"
              aria-label="Sonraki medya"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Luxurious_Script } from 'next/font/google'
import { supabase } from '@/lib/supabaseClient'
import { compressImage } from '@/lib/imageCompression'

const weddingFont = Luxurious_Script({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [uploadCompleted, setUploadCompleted] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)

  const addSelectedFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)

      setFiles(prev => {
        const existingKeys = new Set(
          prev.map(file => `${file.name}-${file.size}-${file.lastModified}`)
        )

        const newFiles = selectedFiles.filter(file => {
          const key = `${file.name}-${file.size}-${file.lastModified}`
          return !existingKeys.has(key)
        })

        return [...prev, ...newFiles]
      })

      setStatus('')
      setUploadCompleted(false)
      e.target.value = ''
    }
  }

  const removeSelectedFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const clearSelectedFiles = () => {
    setFiles([])
    setFileInputKey(prev => prev + 1)
  }

  const resetUploadForm = () => {
    setFiles([])
    setMessage('')
    setStatus('')
    setUploadedCount(0)
    setUploadCompleted(false)
    setFileInputKey(prev => prev + 1)
  }

  const createSafeFileName = (originalName: string, index: number) => {
    const uniquePart =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${index}`

    return `${Date.now()}-${uniquePart}-${originalName}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_.]/g, '_')
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Lütfen en az bir fotoğraf seçin veya fotoğraf çekin')
      return
    }

    try {
      setIsUploading(true)
      setUploadCompleted(false)

      let successCount = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        setStatus(`${i + 1}/${files.length} fotoğraf sıkıştırılıyor...`)

        const compressed = await compressImage(file)

        const fileName = createSafeFileName(compressed.name || file.name, i)
        const filePath = `photos/${fileName}`

        setStatus(`${i + 1}/${files.length} fotoğraf Storage’a yükleniyor...`)

        const { error: uploadError } = await supabase.storage
          .from('wedding-photos')
          .upload(filePath, compressed, {
            contentType: compressed.type || file.type,
            upsert: false,
          })

        if (uploadError) {
          setStatus(
            `${i + 1}. fotoğraf yüklenirken hata oluştu: ${uploadError.message}`
          )
          return
        }

        setStatus(`${i + 1}/${files.length} fotoğraf veritabanına kaydediliyor...`)

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_path: filePath,
            guest_name: null,
            message: message.trim() || null,
            file_size: compressed.size,
            mime_type: compressed.type || file.type,
          }),
        })

        const data = await res.json()

        if (!res.ok || data.error) {
          setStatus(
            `${i + 1}. fotoğraf DB’ye kaydedilirken hata oluştu: ${
              data.error || 'Bilinmeyen hata'
            }`
          )
          return
        }

        successCount++
      }

      setUploadedCount(successCount)
      setUploadCompleted(true)
      setStatus('')

      setFiles([])
      setMessage('')
      setFileInputKey(prev => prev + 1)
    } catch (err: any) {
      setStatus('Hata: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const HeaderContent = () => (
    <div className="relative z-10 mb-5 text-center">
      <p className="text-[11px] font-semibold tracking-[0.35em] text-[#B76E79]">
        06/06/2026
      </p>

      <h1
        className={`${weddingFont.className} mt-2 text-center text-[3.45rem] leading-[0.9] text-[#8A3457] sm:text-[4rem]`}
      >
        <span>Berna</span>
        <span className="mx-1.5 inline-block translate-y-[-0.08em] text-[0.38em] font-sans">
          🤍
        </span>
        <span>Artun</span>
      </h1>

      <div className="mx-auto mt-4 max-w-[420px] text-center text-[#6F5B5D]">
        <p className="text-[0.95rem] font-medium leading-6 sm:text-[1rem]">
          En güzel anlarımızı birlikte hatıralara dönüştürelim 🤍
        </p>

        <p className="mt-1 text-[0.95rem] font-medium leading-6 sm:text-[1rem]">
          Bu özel günde yakaladığınız kareleri bizimle paylaşabilirsiniz.
        </p>

        <p className="mt-3 text-[0.82rem] italic font-semibold leading-5 text-[#7A7677]">
          (Tüm fotoğraflar yalnızca gelin ve damat tarafından görüntülenecektir.)
        </p>
      </div>
    </div>
  )

  const FloralBackground = () => (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <img
        src="/flw.svg"
        alt=""
        className="absolute -right-[232px] -top-[18px] w-[430px] max-w-none select-none opacity-[0.58]"
      />

      <div className="absolute -left-[6px] -bottom-[2px] h-[245px] w-[340px] overflow-hidden opacity-[0.82]">
        <img
          src="/flw.svg"
          alt=""
          className="absolute left-[-10px] top-[18px] w-[350px] max-w-none origin-top-left rotate-[-6deg] select-none"
        />
      </div>
    </div>
  )

  if (uploadCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF7F2] px-3 py-6">
        <div className="relative isolate w-full max-w-md overflow-hidden rounded-2xl border border-[#F0D6D3] bg-white/95 p-6 text-center shadow-xl">
          <FloralBackground />

          <div className="relative z-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#F0D6D3] bg-[#FFF1ED]/90">
              <span className="text-2xl text-[#7A2E3A]">✓</span>
            </div>

            <p className="text-[11px] font-semibold tracking-[0.35em] text-[#B76E79]">
              06/06/2026
            </p>

            <h1
              className={`${weddingFont.className} mt-2 text-center text-[3.25rem] leading-[0.9] text-[#8A3457]`}
            >
              <span>Berna</span>
              <span className="mx-1.5 inline-block translate-y-[-0.08em] text-[0.38em] font-sans">
                🤍
              </span>
              <span>Artun</span>
            </h1>

            <h2 className="mt-4 text-2xl font-semibold text-[#7A2E3A]">
              Fotoğraflarınız Yüklendi
            </h2>

            <p className="mt-2 text-sm text-[#6F5B5D]">
              Bu özel güne katkınız için teşekkür ederiz.
            </p>

            <p className="mt-4 rounded-xl border border-[#F0D6D3] bg-[#FFF9F6]/85 px-4 py-3 text-sm font-semibold text-[#5A4245]">
              {uploadedCount} fotoğraf başarıyla yüklendi.
            </p>

            <p className="mt-3 text-xs italic font-semibold text-[#7A7677]">
              (Tüm fotoğraflar yalnızca gelin ve damat tarafından görüntülenecektir.)
            </p>

            <button
              type="button"
              onClick={resetUploadForm}
              className="mt-5 w-full rounded-xl bg-[#B76E79] py-3 font-semibold text-white shadow-md transition hover:bg-[#9F5965]"
            >
              Yeni Fotoğraf Yükle
            </button>

            <Link
              href="/admin/login"
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#B76E79] bg-white/85 px-4 py-3 text-sm font-semibold text-[#7A2E3A] transition hover:bg-[#FFF1ED]"
            >
              Admin Girişi
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF7F2] px-2 py-3 sm:px-4 sm:py-6">
      <div className="relative isolate w-full max-w-md overflow-hidden rounded-2xl border border-[#F0D6D3] bg-white/95 p-6 shadow-xl">
        <FloralBackground />

        <HeaderContent />

        <div className="relative z-10">
          <textarea
            placeholder="Bize küçük bir not bırakabilirsiniz."
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={isUploading}
            rows={3}
            className="mb-4 min-h-[118px] w-full resize-none rounded-2xl border border-[#E8C7C8] bg-[#FFFDFB]/85 px-5 py-4 text-[#3D2C2E] placeholder:text-[#B38E93] outline-none transition focus:border-[#B76E79] focus:ring-2 focus:ring-[#F3D7D8] disabled:bg-[#F8F0EE]"
          />

          <input
            key={`gallery-${fileInputKey}`}
            id="gallery-upload-input"
            type="file"
            accept="image/*"
            multiple
            onChange={addSelectedFiles}
            disabled={isUploading}
            className="hidden"
          />

          <input
            key={`camera-${fileInputKey}`}
            id="camera-upload-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={addSelectedFiles}
            disabled={isUploading}
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-4">
            <label
              htmlFor="gallery-upload-input"
              className={`flex min-h-[126px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D9A5AD] bg-[#FFF9F6]/85 px-3 py-4 text-center transition ${
                isUploading
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:bg-[#FFF1ED]'
              }`}
            >
              <span className="text-[1.05rem] font-semibold text-[#7A2E3A]">
                Galeriden Seç
              </span>

              <span className="mt-2 text-sm leading-6 text-[#7A6769]">
                Birden fazla fotoğraf
                <br />
                seçebilirsiniz.
              </span>
            </label>

            <label
              htmlFor="camera-upload-input"
              className={`flex min-h-[126px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D9A5AD] bg-[#FFF9F6]/85 px-3 py-4 text-center transition ${
                isUploading
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:bg-[#FFF1ED]'
              }`}
            >
              <span className="text-[1.05rem] font-semibold text-[#7A2E3A]">
                Fotoğraf Çek
              </span>

              <span className="mt-2 text-sm leading-6 text-[#7A6769]">
                Kamerayı açıp yeni
                <br />
                fotoğraf çekin.
              </span>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mb-4 mt-4 rounded-xl border border-[#E8C7C8] bg-[#FFFDFB]/85 p-3 text-sm text-[#4A3A3C]">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#7A2E3A]">
                  {files.length} fotoğraf seçildi.
                </p>

                <button
                  type="button"
                  onClick={clearSelectedFiles}
                  disabled={isUploading}
                  className="text-xs font-semibold text-[#B76E79] hover:text-[#7A2E3A] disabled:opacity-50"
                >
                  Temizle
                </button>
              </div>

              <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="flex items-center justify-between gap-2 text-[#6F5B5D]"
                  >
                    <span className="truncate">
                      {index + 1}. {file.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      disabled={isUploading}
                      className="shrink-0 text-xs font-semibold text-[#B76E79] hover:text-[#7A2E3A] disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="mt-4 w-full rounded-2xl bg-[#BE7784] py-4 text-xl font-semibold text-white shadow-md transition hover:bg-[#AA6674] disabled:cursor-not-allowed disabled:bg-[#CDB8BA]"
          >
            {isUploading ? 'Yükleniyor...' : 'Fotoğrafları Yükle'}
          </button>

          {status && (
            <p className="mt-4 rounded-xl border border-[#F0D6D3] bg-[#FFF3EF]/85 px-4 py-3 text-center text-sm font-medium text-[#5A4245]">
              {status}
            </p>
          )}

          <div className="mt-5 border-t border-[#F0D6D3] pt-4 text-center">
            <Link
              href="/admin/login"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-[#D39AA3] bg-white/85 px-4 py-4 text-[1.02rem] font-semibold text-[#7A2E3A] transition hover:bg-[#FFF1ED]"
            >
              Admin Girişi
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
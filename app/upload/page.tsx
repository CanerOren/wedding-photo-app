'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { compressImage } from '@/lib/imageCompression'

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

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

      let successCount = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        setStatus(`${i + 1}/${files.length} fotoğraf sıkıştırılıyor...`)

        const compressed = await compressImage(file)

        const fileName = createSafeFileName(
          compressed.name || file.name,
          i
        )

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
            guest_name: guestName.trim() || null,
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

      setStatus(`${successCount} fotoğraf başarıyla yüklendi!`)

      setFiles([])
      setGuestName('')
      setMessage('')
      setFileInputKey(prev => prev + 1)
    } catch (err: any) {
      setStatus('Hata: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF7F2] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-xl border border-[#F0D6D3]">
        <div className="mb-6 text-center">
          <p className="text-sm tracking-[0.25em] uppercase text-[#B76E79] font-semibold">
            Wedding Memories
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#7A2E3A]">
            Düğün Fotoğraf Yükleme
          </h1>

          <p className="mt-2 text-sm text-[#6F5B5D]">
            Bu özel günden karelerinizi bizimle paylaşın.
          </p>
        </div>

        <input
          type="text"
          placeholder="Adınız (opsiyonel)"
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          disabled={isUploading}
          className="mb-3 w-full rounded-xl border border-[#E8C7C8] bg-[#FFFDFB] px-4 py-3 text-[#3D2C2E] placeholder:text-[#A98B8E] outline-none transition focus:border-[#B76E79] focus:ring-2 focus:ring-[#F3D7D8] disabled:bg-[#F8F0EE]"
        />

        <textarea
          placeholder="Mesajınız (opsiyonel)"
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={isUploading}
          rows={3}
          className="mb-3 w-full resize-none rounded-xl border border-[#E8C7C8] bg-[#FFFDFB] px-4 py-3 text-[#3D2C2E] placeholder:text-[#A98B8E] outline-none transition focus:border-[#B76E79] focus:ring-2 focus:ring-[#F3D7D8] disabled:bg-[#F8F0EE]"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            htmlFor="gallery-upload-input"
            className={`flex min-h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D7A0A6] bg-[#FFF9F6] px-4 py-5 text-center transition ${
              isUploading
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:bg-[#FFF1ED]'
            }`}
          >
            <span className="font-semibold text-[#7A2E3A]">
              Galeriden Seç
            </span>

            <span className="mt-1 text-sm text-[#7A6769]">
              Birden fazla fotoğraf seçebilirsiniz.
            </span>
          </label>

          <label
            htmlFor="camera-upload-input"
            className={`flex min-h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D7A0A6] bg-[#FFF9F6] px-4 py-5 text-center transition ${
              isUploading
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:bg-[#FFF1ED]'
            }`}
          >
            <span className="font-semibold text-[#7A2E3A]">
              Fotoğraf Çek
            </span>

            <span className="mt-1 text-sm text-[#7A6769]">
              Kamerayı açıp yeni fotoğraf çekin.
            </span>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4 mb-4 rounded-xl border border-[#E8C7C8] bg-[#FFFDFB] p-3 text-sm text-[#4A3A3C]">
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

            <ul className="mt-2 max-h-28 overflow-y-auto space-y-1">
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
          className="mt-4 w-full rounded-xl bg-[#B76E79] py-3 font-semibold text-white shadow-md transition hover:bg-[#9F5965] disabled:cursor-not-allowed disabled:bg-[#CDB8BA]"
        >
          {isUploading ? 'Yükleniyor...' : 'Fotoğrafları Yükle'}
        </button>

        {status && (
          <p className="mt-4 rounded-xl bg-[#FFF3EF] px-4 py-3 text-center text-sm font-medium text-[#5A4245] border border-[#F0D6D3]">
            {status}
          </p>
        )}

        <div className="mt-5 border-t border-[#F0D6D3] pt-4 text-center">
          <Link
            href="/admin/login"
            className="inline-flex w-full items-center justify-center rounded-xl border border-[#B76E79] bg-white px-4 py-3 text-sm font-semibold text-[#7A2E3A] transition hover:bg-[#FFF1ED]"
          >
            Admin Girişi
          </Link>
        </div>
      </div>
    </div>
  )
}
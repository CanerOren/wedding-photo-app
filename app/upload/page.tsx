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
          ♡
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

  if (uploadCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7F2] px-3 py-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#F0D6D3] bg-white/95 p-6 text-center shadow-xl">
          <div className="pointer-events-none absolute -right-14 -top-10 z-0 opacity-[0.16]">
            <FloralTopRight />
          </div>

          <div className="pointer-events-none absolute -bottom-16 -left-14 z-0 opacity-[0.14]">
            <FloralBottomLeft />
          </div>

          <div className="relative z-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#F0D6D3] bg-[#FFF1ED]">
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
                ♡
              </span>
              <span>Artun</span>
            </h1>

            <h2 className="mt-4 text-2xl font-semibold text-[#7A2E3A]">
              Fotoğraflarınız Yüklendi
            </h2>

            <p className="mt-2 text-sm text-[#6F5B5D]">
              Bu özel güne katkınız için teşekkür ederiz.
            </p>

            <p className="mt-4 rounded-xl border border-[#F0D6D3] bg-[#FFF9F6] px-4 py-3 text-sm font-semibold text-[#5A4245]">
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
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#B76E79] bg-white px-4 py-3 text-sm font-semibold text-[#7A2E3A] transition hover:bg-[#FFF1ED]"
            >
              Admin Girişi
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF7F2] px-2 py-3 sm:px-4 sm:py-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#F0D6D3] bg-white/95 p-6 shadow-xl">
        <div className="pointer-events-none absolute -right-14 -top-10 z-0 opacity-[0.16]">
          <FloralTopRight />
        </div>

        <div className="pointer-events-none absolute -bottom-16 -left-14 z-0 opacity-[0.14]">
          <FloralBottomLeft />
        </div>

        <HeaderContent />

        <div className="relative z-10">
          <textarea
            placeholder="Bize küçük bir not bırakabilirsiniz."
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={isUploading}
            rows={3}
            className="mb-4 min-h-[118px] w-full resize-none rounded-2xl border border-[#E8C7C8] bg-[#FFFDFB]/95 px-5 py-4 text-[#3D2C2E] placeholder:text-[#B38E93] outline-none transition focus:border-[#B76E79] focus:ring-2 focus:ring-[#F3D7D8] disabled:bg-[#F8F0EE]"
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
              className={`flex min-h-[126px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D9A5AD] bg-[#FFF9F6]/95 px-3 py-4 text-center transition ${
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
              className={`flex min-h-[126px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D9A5AD] bg-[#FFF9F6]/95 px-3 py-4 text-center transition ${
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
            <div className="mt-4 mb-4 rounded-xl border border-[#E8C7C8] bg-[#FFFDFB]/95 p-3 text-sm text-[#4A3A3C]">
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
            className="mt-4 w-full rounded-2xl bg-[#BE7784] py-4 text-xl font-semibold text-white shadow-md transition hover:bg-[#AA6674] disabled:cursor-not-allowed disabled:bg-[#CDB8BA]"
          >
            {isUploading ? 'Yükleniyor...' : 'Fotoğrafları Yükle'}
          </button>

          {status && (
            <p className="mt-4 rounded-xl border border-[#F0D6D3] bg-[#FFF3EF] px-4 py-3 text-center text-sm font-medium text-[#5A4245]">
              {status}
            </p>
          )}

          <div className="mt-5 border-t border-[#F0D6D3] pt-4 text-center">
            <Link
              href="/admin/login"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-[#D39AA3] bg-white/95 px-4 py-4 text-[1.02rem] font-semibold text-[#7A2E3A] transition hover:bg-[#FFF1ED]"
            >
              Admin Girişi
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function FloralTopRight() {
  return (
    <svg
      width="330"
      height="360"
      viewBox="0 0 330 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#D9AAB3]"
    >
      <g stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <path d="M180 28C205 8 240 18 251 47C263 78 237 109 202 101C172 94 159 55 180 28Z" />
        <path d="M207 32C229 20 257 31 265 56C273 82 252 107 224 104C198 101 186 50 207 32Z" />
        <path d="M241 75C270 61 304 79 309 112C314 146 284 169 252 156C223 144 217 90 241 75Z" />
        <path d="M224 119C247 104 281 111 294 137C309 166 287 199 254 200C224 201 199 136 224 119Z" />
        <path d="M174 116C145 115 124 91 129 64C135 35 165 19 190 32" />
        <path d="M159 142C126 150 96 131 88 99C81 70 103 42 132 44" />
        <path d="M184 162C153 184 110 176 90 145C72 117 81 80 108 63" />
        <path d="M186 162C199 127 223 96 254 74" />
        <path d="M185 162C215 151 249 153 278 168" />
        <path d="M194 104C190 83 192 63 203 42" />
        <path d="M221 105C234 85 253 70 276 63" />
        <path d="M245 156C263 143 284 137 307 141" />
        <path d="M131 190C154 170 188 173 207 195C229 221 216 260 182 269C148 278 112 252 110 217C109 207 117 197 131 190Z" />
        <path d="M149 196C164 184 187 186 199 203C213 222 203 247 181 253C159 259 136 244 133 222C132 212 139 202 149 196Z" />
        <path d="M102 207C74 219 62 253 78 280C94 308 132 313 153 290C172 269 158 229 129 218" />
        <path d="M207 195C234 200 258 218 274 244" />
        <path d="M197 249C221 262 238 285 244 312" />
        <path d="M146 288C147 314 158 337 178 354" />
        <path d="M112 276C94 294 83 317 81 344" />
        <path d="M77 281C50 285 28 299 14 322" />
        <path d="M85 99C63 88 49 69 44 45" />
        <path d="M95 132C67 132 42 121 23 101" />
        <path d="M90 146C63 156 43 176 33 202" />
        <path d="M276 167C299 175 316 191 326 213" />
        <path d="M270 245C292 253 309 270 318 292" />
        <path d="M151 70C163 81 173 95 180 112" />
        <path d="M250 44C250 57 254 70 263 81" />
      </g>
    </svg>
  )
}

function FloralBottomLeft() {
  return (
    <svg
      width="320"
      height="340"
      viewBox="0 0 320 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#D9AAB3]"
    >
      <g stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <path d="M82 191C105 170 141 173 160 198C181 226 165 264 130 272C96 279 63 253 63 219C63 208 70 198 82 191Z" />
        <path d="M104 193C119 180 143 183 155 201C168 221 157 248 134 253C111 258 89 241 88 218C87 208 94 198 104 193Z" />
        <path d="M151 169C164 135 197 115 231 124C266 134 284 170 271 204C258 238 219 252 188 234C161 218 141 198 151 169Z" />
        <path d="M184 147C196 121 225 108 251 119C279 131 289 163 274 189C260 214 226 222 203 205C180 188 172 172 184 147Z" />
        <path d="M74 190C45 187 22 164 22 135C22 104 49 82 78 88C107 94 122 124 111 153" />
        <path d="M97 166C69 151 57 116 71 87C86 57 123 47 150 67C176 86 181 124 160 149" />
        <path d="M159 198C187 197 216 207 240 226" />
        <path d="M160 198C143 230 135 265 139 301" />
        <path d="M129 272C116 292 109 313 111 337" />
        <path d="M88 251C65 268 49 290 42 317" />
        <path d="M64 221C39 226 18 240 3 261" />
        <path d="M72 88C52 74 40 54 36 30" />
        <path d="M101 62C94 40 98 20 112 3" />
        <path d="M150 67C166 50 187 41 212 40" />
        <path d="M229 124C245 104 268 92 295 88" />
        <path d="M271 204C293 215 309 233 317 257" />
        <path d="M240 226C258 242 269 262 272 287" />
        <path d="M141 105C148 119 151 134 149 151" />
        <path d="M91 131C113 135 134 143 153 156" />
        <path d="M202 181C221 174 241 174 261 181" />
        <path d="M197 129C207 146 214 164 216 184" />
        <path d="M46 170C29 177 16 189 7 205" />
        <path d="M51 112C31 108 15 96 4 79" />
      </g>
    </svg>
  )
}
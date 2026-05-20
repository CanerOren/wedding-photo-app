import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const authClient = createClient(supabaseUrl, supabaseAnonKey)

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '')
      : null

    if (!token) {
      return NextResponse.json(
        { error: 'Yetkisiz işlem. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }

    const { id } = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Geçersiz fotoğraf ID.' },
        { status: 400 }
      )
    }

    const { data: photo, error: fetchError } = await adminClient
      .from('photos')
      .select('id, file_path')
      .eq('id', id)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json(
        { error: 'Fotoğraf kaydı bulunamadı.' },
        { status: 404 }
      )
    }

    const cleanFilePath = photo.file_path.replace(/^\/+/, '')

    const { error: storageError } = await adminClient.storage
      .from('wedding-photos')
      .remove([cleanFilePath])

    if (storageError) {
      return NextResponse.json(
        { error: 'Storage silme hatası: ' + storageError.message },
        { status: 400 }
      )
    }

    const { error: dbDeleteError } = await adminClient
      .from('photos')
      .delete()
      .eq('id', id)

    if (dbDeleteError) {
      return NextResponse.json(
        { error: 'Veritabanı silme hatası: ' + dbDeleteError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Bilinmeyen bir hata oluştu.' },
      { status: 500 }
    )
  }
}
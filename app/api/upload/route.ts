import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const {
      file_path,
      guest_name = null,
      message = null,
      file_size = null,
      mime_type = null,
    } = await req.json()

    if (!file_path || typeof file_path !== 'string') {
      return NextResponse.json(
        { error: 'file_path zorunludur.' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('photos').insert([
      {
        file_path,
        guest_name,
        message,
        file_size,
        mime_type,
      },
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Bilinmeyen hata oluştu.' },
      { status: 500 }
    )
  }
}
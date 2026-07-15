import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    name: 'DayByDay',
    short_name: 'DayByDay',
    description: 'Build lasting habits, one day at a time.',
    start_url: '/today',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6366f1',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['health', 'productivity', 'lifestyle'],
  })
}

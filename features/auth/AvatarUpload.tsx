'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, User } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const SIZES = {
  sm:  { container: 'h-8 w-8',   icon: 'h-4 w-4',   camera: 'h-3 w-3',   px: 32  },
  md:  { container: 'h-16 w-16', icon: 'h-8 w-8',   camera: 'h-4 w-4',   px: 64  },
  lg:  { container: 'h-24 w-24', icon: 'h-12 w-12', camera: 'h-5 w-5',   px: 96  },
}

interface AvatarUploadProps {
  userId: string
  avatarUrl?: string | null
  size?: keyof typeof SIZES
  readOnly?: boolean
  onUpload?: (url: string) => void
  className?: string
}

export function AvatarUpload({
  userId,
  avatarUrl,
  size = 'md',
  readOnly = false,
  onUpload,
  className,
}: AvatarUploadProps) {
  const [url, setUrl] = useState(avatarUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const s = SIZES[size]

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`
      const supabase = getSupabaseBrowserClient()

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust so the browser fetches the new image
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      setUrl(publicUrl)
      onUpload?.(publicUrl)
      toast.success('Profile picture updated')
    } catch {
      toast.error('Upload failed — please try again')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const trigger = () => {
    if (!readOnly && !uploading) inputRef.current?.click()
  }

  return (
    <div className={cn('relative inline-block shrink-0', className)}>
      {/* Circle */}
      <div
        className={cn(
          s.container,
          'relative rounded-full bg-primary/10 flex items-center justify-center overflow-hidden',
          !readOnly && 'cursor-pointer group',
          uploading && 'opacity-60',
        )}
        onClick={trigger}
        role={readOnly ? undefined : 'button'}
        tabIndex={readOnly ? undefined : 0}
        aria-label={readOnly ? 'Profile picture' : 'Change profile picture'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') trigger() }}
      >
        {url ? (
          <Image
            src={url}
            alt="Profile picture"
            fill
            className="object-cover"
            sizes={`${s.px}px`}
          />
        ) : (
          <User className={cn(s.icon, 'text-primary')} aria-hidden />
        )}

        {/* Upload overlay — only when interactive */}
        {!readOnly && (
          <div className={cn(
            'absolute inset-0 rounded-full bg-black/45 flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            uploading && 'opacity-100',
          )}>
            <Camera className={cn(s.camera, 'text-white')} aria-hidden />
          </div>
        )}
      </div>

      {!readOnly && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="sr-only"
          aria-hidden
          onChange={handleFile}
        />
      )}
    </div>
  )
}

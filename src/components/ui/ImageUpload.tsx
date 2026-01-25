'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Loader2 } from 'lucide-react'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  aspectRatio?: string
  label?: string
  helperText?: string
}

export default function ImageUpload({
  value,
  onChange,
  aspectRatio = '16/9',
  label,
  helperText,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }

      setIsUploading(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          onChange(data.url)
        } else {
          const data = await res.json()
          setError(data.error || 'Upload failed')
        }
      } catch (err) {
        setError('Upload failed. Please try again.')
      } finally {
        setIsUploading(false)
      }
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  const handleRemove = () => {
    onChange('')
    setError(null)
  }

  // Calculate aspect ratio for preview container
  const getAspectPadding = () => {
    if (aspectRatio === '16/9') return '56.25%' // 9/16 * 100
    if (aspectRatio === '3/4') return '133.33%' // 4/3 * 100
    if (aspectRatio === '1/1') return '100%'
    return '56.25%'
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">{label}</label>
      )}

      {value ? (
        <div className="relative">
          <div
            className="relative w-full overflow-hidden rounded-lg bg-[#1A1A2E]"
            style={{ paddingBottom: getAspectPadding() }}
          >
            <img
              src={value}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragActive
              ? 'border-eha-red bg-eha-red/10'
              : 'border-[#1a3a6e] hover:border-eha-red/50'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          <div
            className="flex flex-col items-center justify-center p-6"
            style={{ minHeight: aspectRatio === '3/4' ? '200px' : '120px' }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-eha-red animate-spin mb-2" />
                <p className="text-sm text-gray-400">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-500 mb-2" />
                <p className="text-sm text-gray-400 text-center">
                  {isDragActive
                    ? 'Drop the image here'
                    : 'Drag & drop an image, or click to select'}
                </p>
                {helperText && (
                  <p className="text-xs text-gray-500 mt-1">{helperText}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Download, Tag, Camera, Hash, Loader2, User, Copy, Image, Package, Edit, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import type { ImageMetadata } from '@/types'
import { PdfViewer } from './pdf-viewer'

// Peel Logo Component
const PeelLogo = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 2.5C8 2.5 10.5 4 10.5 8C10.5 12 8 13.5 8 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M13.5 5.5L11 8L13.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// StaticDAM Logo Component
const StaticDAMLogo = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g clipPath="url(#clip0_2_3032)">
      <path d="M12.7681 12.7694C14.0842 11.4534 13.0157 8.25115 10.3816 5.61706C7.74756 2.98297 4.54533 1.91451 3.22926 3.23058C1.9132 4.54664 2.98166 7.74887 5.61575 10.383C8.24983 13.017 11.4521 14.0855 12.7681 12.7694Z" stroke="currentColor" strokeWidth="1.25" strokeMiterlimit="10"/>
      <path d="M10.3816 10.3829C13.0157 7.74885 14.0842 4.54662 12.7681 3.23055C11.4521 1.91449 8.24983 2.98295 5.61575 5.61704C2.98166 8.25113 1.9132 11.4534 3.22926 12.7694C4.54533 14.0855 7.74756 13.017 10.3816 10.3829Z" stroke="currentColor" strokeWidth="1.25" strokeMiterlimit="10"/>
    </g>
    <defs>
      <clipPath id="clip0_2_3032">
        <rect width="16" height="16" fill="white"/>
      </clipPath>
    </defs>
  </svg>
)

interface ImageLightboxProps {
  image: ImageMetadata
  images: ImageMetadata[]
  isOpen: boolean
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
  onEditMetadata?: () => void
  onFilterSelect?: (filter: string) => void
}

export function ImageLightbox({ image, images, isOpen, onClose, onNavigate, onEditMetadata, onFilterSelect }: ImageLightboxProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [loadProgress, setLoadProgress] = useState(0)
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [sheetDragOffset, setSheetDragOffset] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const sheetTouchStartRef = useRef<{ y: number; time: number } | null>(null)
  const currentIndex = images.findIndex(img => img.path === image.path)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1
  const isVideo = image.isVideo || /\.(mp4|mov|webm|avi)$/i.test(image.path)
  const isPdf = image.isPdf || /\.pdf$/i.test(image.path)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (hasPrev) onNavigate('prev')
          break
        case 'ArrowRight':
          e.preventDefault()
          if (hasNext) onNavigate('next')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasPrev, hasNext, onNavigate])

  // Reset loading state when image changes
  useEffect(() => {
    setIsLoading(true)
    setImageDimensions({ width: 0, height: 0 })
    setLoadProgress(0)

    // Revoke previous blob URL to free memory
    if (imageBlobUrl) {
      URL.revokeObjectURL(imageBlobUrl)
      setImageBlobUrl(null)
    }
  }, [image.path])

  // Stream large images with progress tracking
  useEffect(() => {
    const isVideo = image.isVideo || /\.(mp4|mov|webm|avi)$/i.test(image.path)
    const isPdf = image.isPdf || /\.pdf$/i.test(image.path)

    // Only stream for large images (over 500KB), skip for videos and PDFs
    if (isVideo || isPdf || image.bytes < 500000) {
      return
    }

    const controller = new AbortController()

    const fetchWithProgress = async () => {
      try {
        const response = await fetch(`/${image.path}`, { signal: controller.signal })

        if (!response.ok || !response.body) {
          return
        }

        const contentLength = response.headers.get('content-length')
        const total = contentLength ? parseInt(contentLength, 10) : image.bytes

        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let received = 0

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          chunks.push(value)
          received += value.length

          if (total > 0) {
            setLoadProgress(Math.round((received / total) * 100))
          }
        }

        const blob = new Blob(chunks)
        const url = URL.createObjectURL(blob)
        setImageBlobUrl(url)
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error loading image with progress:', err)
        }
      }
    }

    fetchWithProgress()

    return () => {
      controller.abort()
    }
  }, [image.path, image.bytes, image.isVideo, image.isPdf])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl)
      }
    }
  }, [imageBlobUrl])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = `/${image.path}`
    link.download = image.path.split('/').pop() || 'image'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  const getFolder = () => {
    const parts = image.path.split('/')
    return parts.length > 2 ? parts[1] : 'Root'
  }

  const fileName = image.path.split('/').pop() || 'Unknown'

  // Generate share URLs
  const damUrl = `${window.location.origin}/asset/${encodeURIComponent(image.path)}`
  const assetUrl = `${window.location.origin}/${image.path}`
  const peelUrl = `https://banana.peel.diy/edit?img=${encodeURIComponent(assetUrl)}`

  // Copy to clipboard functionality
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard!`)
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast.success(`${label} copied to clipboard!`)
      } catch (fallbackErr) {
        toast.error('Failed to copy to clipboard')
      }
    }
  }

  // Smooth close animation
  const closeWithAnimation = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }, [onClose])

  // Touch handlers for image swipe navigation
  const handleImageTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    }
  }, [])

  const handleImageTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const deltaX = e.touches[0].clientX - touchStartRef.current.x
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y)

    // Only swipe horizontally if not scrolling vertically
    if (deltaY < 50) {
      setSwipeOffset(deltaX)
    }
  }, [])

  const handleImageTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return

    const elapsed = Date.now() - touchStartRef.current.time
    const velocity = Math.abs(swipeOffset) / elapsed

    // Threshold: 50px or 0.3px/ms velocity
    if (swipeOffset > 50 || (swipeOffset > 0 && velocity > 0.3)) {
      if (hasPrev) onNavigate('prev')
    } else if (swipeOffset < -50 || (swipeOffset < 0 && velocity > 0.3)) {
      if (hasNext) onNavigate('next')
    }

    setSwipeOffset(0)
    touchStartRef.current = null
  }, [swipeOffset, hasPrev, hasNext, onNavigate])

  // Touch handlers for bottom sheet drag-to-close
  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    sheetTouchStartRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    }
  }, [])

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (!sheetTouchStartRef.current) return

    const deltaY = e.touches[0].clientY - sheetTouchStartRef.current.y

    // Only drag down
    if (deltaY > 0) {
      setSheetDragOffset(deltaY)
    }
  }, [])

  const handleSheetTouchEnd = useCallback(() => {
    if (!sheetTouchStartRef.current) return

    // Close if dragged more than 100px down
    if (sheetDragOffset > 100) {
      closeWithAnimation()
    }

    setSheetDragOffset(0)
    sheetTouchStartRef.current = null
  }, [sheetDragOffset, closeWithAnimation])

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="inset-0 w-full max-w-full h-full p-0 border-none sm:max-w-full bg-transparent"
        side="right"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">
          {image.subject || fileName}
        </SheetTitle>
        <div className="flex flex-col md:flex-row h-full">
          {/* Image Area - No animation on container to prevent interference */}
          <div
            ref={imageContainerRef}
            className="h-1/2 md:h-full flex-1 flex items-center justify-center p-4 relative"
            onTouchStart={handleImageTouchStart}
            onTouchMove={handleImageTouchMove}
            onTouchEnd={handleImageTouchEnd}
          >
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="md:hidden absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Main Media (Image or Video) */}
            <div
              className="max-w-full max-h-full flex items-center justify-center relative"
              style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.2s' : 'none' }}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                    {!isVideo && image.bytes >= 500000 && loadProgress > 0 && loadProgress < 100 ? (
                      <>
                        <span className="text-white text-sm">{formatFileSize(image.bytes)}</span>
                        <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white transition-all duration-150"
                            style={{ width: `${loadProgress}%` }}
                          />
                        </div>
                        <span className="text-white text-sm">{loadProgress}%</span>
                      </>
                    ) : (
                      <span className="text-white text-sm">Loading {isVideo ? 'video' : 'image'}...</span>
                    )}
                  </div>
                </div>
              )}
              {isPdf ? (
                <PdfViewer
                  src={`/${image.path}`}
                  className="max-w-full max-h-full"
                />
              ) : isVideo ? (
                <video
                  ref={videoRef}
                  src={`/${image.path}`}
                  controls
                  autoPlay
                  muted
                  className={`max-w-full max-h-full object-contain ${
                    isLoading ? 'opacity-0' : 'opacity-100 animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-both'
                  }`}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget
                    setImageDimensions({
                      width: video.videoWidth,
                      height: video.videoHeight
                    })
                    setIsLoading(false)
                  }}
                  onError={() => setIsLoading(false)}
                />
              ) : (
                <img
                  ref={imgRef}
                  src={imageBlobUrl || `/${image.path}`}
                  alt={image.subject || fileName}
                  className={`max-w-full max-h-full object-contain ${
                    isLoading ? 'opacity-0' : 'opacity-100 animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-both'
                  }`}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setImageDimensions({
                      width: img.naturalWidth,
                      height: img.naturalHeight
                    })
                    setIsLoading(false)
                  }}
                  onError={() => setIsLoading(false)}
                />
              )}
            </div>


            {/* Navigation Bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 text-white px-4 py-2 rounded-full">
              {hasPrev ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                  onClick={() => onNavigate('prev')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <div className="h-8 w-8" />
              )}

              <span className="text-sm font-medium">
                {currentIndex + 1} of {images.length}
              </span>

              {hasNext ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                  onClick={() => onNavigate('next')}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              ) : (
                <div className="h-8 w-8" />
              )}
            </div>
          </div>

          {/* Metadata Sidebar / Bottom Sheet on Mobile */}
          <div
            className="h-1/2 md:h-full md:w-96 bg-white dark:bg-black flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-500 rounded-t-2xl md:rounded-none"
            style={{
              transform: isClosing ? 'translateY(100%)' : `translateY(${sheetDragOffset}px)`,
              transition: isClosing ? 'transform 0.3s ease-out' : (sheetDragOffset === 0 ? 'transform 0.15s' : 'none')
            }}
          >
            {/* Mobile drag handle */}
            <div
              className="md:hidden flex justify-center py-2 cursor-grab active:cursor-grabbing"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
              onClick={closeWithAnimation}
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            <div className="flex-1 px-6 py-6 md:py-6 overflow-y-auto">
              <div>
                {/* File Info */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    File Info
                  </h3>
                  <dl className="mt-2 space-y-1.5 border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between text-sm font-medium">
                      <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="text-gray-900 dark:text-white text-right truncate max-w-[60%]" title={fileName}>{fileName}</dd>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <dt className="text-gray-500 dark:text-gray-400">Folder</dt>
                      <dd className="text-gray-900 dark:text-white">{getFolder()}</dd>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <dt className="text-gray-500 dark:text-gray-400">Frame</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {imageDimensions.width || image.w || 0} × {imageDimensions.height || image.h || 0}
                      </dd>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <dt className="text-gray-500 dark:text-gray-400">File size</dt>
                      <dd className="text-gray-900 dark:text-white">{formatFileSize(image.bytes)}</dd>
                    </div>
                    {image.dateTaken && (
                      <div className="flex justify-between text-sm font-medium">
                        <dt className="text-gray-500 dark:text-gray-400">Date taken</dt>
                        <dd className="text-gray-900 dark:text-white">{formatDate(image.dateTaken)}</dd>
                      </div>
                    )}
                    {image.duration && (
                      <div className="flex justify-between text-sm font-medium">
                        <dt className="text-gray-500 dark:text-gray-400">Duration</dt>
                        <dd className="text-gray-900 dark:text-white">
                          {Math.floor(image.duration / 60)}:{String(Math.floor(image.duration % 60)).padStart(2, '0')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Share URLs */}
                
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Share URLs</h3>
                  <div className="space-y-3 text-sm">
                    {/* DAM */}
                    <div className="flex items-center gap-2">
                      <StaticDAMLogo className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground flex-shrink-0 w-10">DAM</span>
                      <div className="relative flex-1 min-w-0">
                        <input
                          type="text"
                          value={damUrl}
                          readOnly
                          className="w-full px-2 pr-8 py-1 text-xs border rounded bg-muted/50 text-muted-foreground"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <button
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          onClick={() => copyToClipboard(damUrl, 'DAM URL')}
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Asset */}
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground flex-shrink-0 w-10">Asset</span>
                      <div className="relative flex-1 min-w-0">
                        <input
                          type="text"
                          value={assetUrl}
                          readOnly
                          className="w-full px-2 pr-8 py-1 text-xs border rounded bg-muted/50 text-muted-foreground"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <button
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          onClick={() => copyToClipboard(assetUrl, 'Asset URL')}
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Peel - hidden for PDFs */}
                    {!isPdf && (
                      <div className="flex items-center gap-2">
                        <PeelLogo className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground flex-shrink-0 w-10">Peel</span>
                        <div className="relative flex-1 min-w-0">
                          <input
                            type="text"
                            value={peelUrl}
                            readOnly
                            className="w-full px-2 pr-8 py-1 text-xs border rounded bg-muted/50 text-muted-foreground"
                            onClick={(e) => e.currentTarget.select()}
                          />
                          <button
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            onClick={() => copyToClipboard(peelUrl, 'Peel URL')}
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera Info */}
                {image.camera && (
                  <>
                   
                    <div className="mt-2">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Camera
                    </h3>
                      <div className="space-y-2 text-sm">
                        {image.camera.make && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground min-w-16">Make:</span>
                            <span>{image.camera.make}</span>
                          </div>
                        )}
                        {image.camera.model && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground min-w-16">Model:</span>
                            <span>{image.camera.model}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Category */}
                {image.category && image.category.length > 0 && (
                  <>
                    
                    <div className="mt-5">
                    <h3 className="font-semibold mb-1 flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      Categories
                    </h3>
                      <div className="flex flex-wrap gap-2">
                        {image.category.map((cat, index) => (
                          <Badge
                            key={index}
                            variant="category"
                            clickable={!!onFilterSelect}
                            onClick={() => {
                              if (onFilterSelect) {
                                console.log('Filtering by category:', `category:${cat}`)
                                onFilterSelect(`category:${cat}`)
                                onClose()
                              }
                            }}
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Tags */}
                {image.tags && image.tags.length > 0 && (
                  <>
                    
                    <div className="mt-4">
                    <h3 className="font-semibold mb-1 flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Tags
                    </h3>
                      <div className="flex flex-wrap gap-2">
                        {image.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="tag"
                            clickable={!!onFilterSelect}
                            onClick={() => {
                              if (onFilterSelect) {
                                onFilterSelect(`tag:${tag}`)
                                onClose()
                              }
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Person */}
                {image.person && image.person.length > 0 && (
                  <>
                    
                    <div className="mt-4">
                    <h3 className="font-semibold mb-1 flex items-center gap-1">
                      <User className="h-4 w-4" />
                      People
                    </h3>
                      <div className="flex flex-wrap gap-2">
                        {image.person.map((person, index) => (
                          <Badge
                            key={index}
                            variant="person"
                            clickable={!!onFilterSelect}
                            onClick={() => {
                              if (onFilterSelect) {
                                onFilterSelect(`person:${person}`)
                                onClose()
                              }
                            }}
                          >
                            {person}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Hierarchical */}
                {image.hierarchical && image.hierarchical.length > 0 && (
                  <>
                    
                    <div className="mt-4">
                    <h3 className="font-semibold mb-1">Hierarchical Keywords</h3>
                      <div className="space-y-1">
                        {image.hierarchical.map((keyword, index) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            {keyword}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Products */}
                {image.product && image.product.length > 0 && (
                  <>
                    
                    <div className="mt-4">
                    <h3 className="font-semibold mb-1 flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      Products
                    </h3>
                      <div className="flex flex-wrap gap-2">
                        {image.product.map((product, index) => (
                          <Badge
                            key={index}
                            variant="product"
                            clickable={!!onFilterSelect}
                            onClick={() => {
                              if (onFilterSelect) {
                                onFilterSelect(`product:${product}`)
                                onClose()
                              }
                            }}
                          >
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer with Edit Metadata and Download buttons */}
            <SheetFooter className="px-6 pb-6 flex flex-col gap-3">
              {onEditMetadata && (
                <Button onClick={onEditMetadata} variant="outline" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Data
                </Button>
              )}
              <Button
                onClick={handleDownload}
                className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
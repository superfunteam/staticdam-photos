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
import { PdfViewer } from '@/components/pdf-viewer'

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

// Peel Logo Component
const PeelLogo = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M30.101 0.675201C35.3095 0.675201 38.9172 5.06785 41.0892 9.39005V9.39102C43.3271 13.8476 44.5247 19.1409 44.5248 22.6C44.5248 25.9523 44.0898 29.2197 43.2689 32.3061C44.6337 32.7077 45.942 33.2937 47.1595 34.0541H47.1605C49.4551 35.4892 51.3414 37.4927 52.6322 39.8734C53.8421 42.1052 54.4898 44.5952 54.5258 47.1273L54.5248 47.6342C54.5066 48.6965 53.6292 49.5438 52.5658 49.5258H52.5638C51.5047 49.5042 50.6563 48.6291 50.6742 47.5668V47.5658C50.7119 45.5232 50.2215 43.5028 49.2484 41.7074V41.7065C48.2724 39.9127 46.851 38.3992 45.1205 37.3178H45.1195C44.1733 36.7252 43.1472 36.276 42.0775 35.9731C37.9279 46.7105 28.7117 54.5247 16.3734 54.5248C13.4409 54.5248 9.7561 54.5353 6.80408 53.851C5.31831 53.5068 3.81555 52.9429 2.65759 51.9545V51.9535C1.42022 50.8966 0.675171 49.4314 0.675171 47.599C0.675211 46.4202 0.900013 45.328 1.48572 44.3783L1.48669 44.3773C2.07477 43.4283 2.90784 42.8037 3.78845 42.3607C4.63978 41.9325 5.62617 41.6271 6.61658 41.3559C7.11867 41.2185 7.66028 41.0794 8.2113 40.9369L9.95837 40.4711L10.0082 40.4565C16.4312 38.6754 21.3989 34.6774 24.2953 29.682C23.3224 29.2945 22.3014 29.0273 21.2435 28.8803V28.8813C17.2262 28.3272 12.6529 29.4332 8.55505 31.7729L8.55408 31.7719C7.63236 32.299 6.45395 31.9777 5.92712 31.0541V31.0531C5.40098 30.1317 5.72202 28.9539 6.6449 28.4272C11.2991 25.7673 16.7247 24.3737 21.7699 25.0688L22.3959 25.1664C23.61 25.3785 24.792 25.7181 25.9271 26.1879C27.423 22.0251 27.5952 17.4198 26.142 12.9174L26.1097 12.8168V12.8051C25.3451 10.3609 24.8601 7.65448 25.1615 5.43106C25.3149 4.29277 25.7009 3.09606 26.5502 2.16153C27.4516 1.16593 28.6926 0.675233 30.101 0.675201ZM27.5922 31.6654C24.3403 37.23 18.9301 41.6775 12.0844 43.85L12.1049 43.8705L10.9906 44.1811C10.3441 44.361 9.73208 44.5172 9.1781 44.6615L9.17615 44.6625L7.63513 45.0697C6.67599 45.3334 6.00465 45.5558 5.51794 45.8002L5.51697 45.7992C5.05814 46.0309 4.86651 46.2323 4.76111 46.4027C4.65514 46.5763 4.52576 46.9072 4.52576 47.599C4.52579 48.2694 4.751 48.6767 5.16052 49.0258L5.16248 49.0277C5.64585 49.4434 6.46236 49.8184 7.67126 50.0981L8.13708 50.1977C10.5068 50.6642 13.4993 50.6742 16.3734 50.6742C26.4298 50.6742 34.2766 44.5396 38.1117 35.5492C36.4991 35.6497 34.9206 36.076 33.476 36.8129L33.4769 36.8139C33.0179 37.0488 32.4854 37.0887 31.9974 36.9262V36.9252C31.5122 36.7658 31.1087 36.4206 30.8783 35.9633L30.8773 35.9613C29.9761 34.157 28.8577 32.7456 27.5922 31.6654ZM30.101 4.52579C29.8551 4.52579 29.7028 4.56367 29.6078 4.60294C29.517 4.64045 29.454 4.68915 29.3988 4.74942C29.2622 4.90303 29.0712 5.25455 28.9769 5.94962C28.7833 7.37492 29.0946 9.48491 29.809 11.7367L29.8119 11.7445L29.8138 11.7523L30.184 13.0199L30.1869 13.0287L30.1888 13.0365C31.5577 18.2187 31.1464 23.4313 29.3177 28.1117C30.88 29.2821 32.2679 30.786 33.4271 32.6459C35.3514 31.935 37.403 31.6031 39.4652 31.683C40.2551 28.8308 40.6761 25.7742 40.6761 22.6C40.676 19.808 39.6492 15.1023 37.6498 11.1215H37.6488C35.5849 7.00992 32.9426 4.52582 30.101 4.52579Z" fill="currentColor" stroke="currentColor" strokeWidth="1.35"/>
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
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 })
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [sheetDragOffset, setSheetDragOffset] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const sheetTouchStartRef = useRef<{ y: number; time: number } | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const currentIndex = images.findIndex(img => img.path === image.path)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1
  const isVideo = image.isVideo || /\.(mp4|mov|webm|avi)$/i.test(image.path)
  const isPdf = image.isPdf || /\.pdf$/i.test(image.path)

  // Animated close function - slides sheet down then closes
  const closeWithAnimation = useCallback(() => {
    setIsClosing(true)
    setSheetDragOffset(window.innerHeight) // Slide fully off screen
    setTimeout(() => {
      setIsClosing(false)
      setSheetDragOffset(0)
      onClose()
    }, 300) // Match the transition duration
  }, [onClose])

  // Touch handlers for image swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

    // Only track horizontal swipes (ignore if more vertical)
    if (deltaY < Math.abs(deltaX)) {
      setSwipeOffset(deltaX)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return

    const swipeThreshold = 50 // minimum distance
    const velocityThreshold = 0.3 // pixels per ms
    const elapsed = Date.now() - touchStartRef.current.time
    const velocity = Math.abs(swipeOffset) / elapsed

    if (Math.abs(swipeOffset) > swipeThreshold || velocity > velocityThreshold) {
      if (swipeOffset > 0 && hasPrev) {
        onNavigate('prev')
      } else if (swipeOffset < 0 && hasNext) {
        onNavigate('next')
      }
    }

    setSwipeOffset(0)
    touchStartRef.current = null
  }, [swipeOffset, hasPrev, hasNext, onNavigate])

  // Touch handlers for bottom sheet drag-to-close
  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    sheetTouchStartRef.current = { y: touch.clientY, time: Date.now() }
  }, [])

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (!sheetTouchStartRef.current) return
    const touch = e.touches[0]
    const deltaY = touch.clientY - sheetTouchStartRef.current.y

    // Only allow dragging down
    if (deltaY > 0) {
      setSheetDragOffset(deltaY)
    }
  }, [])

  const handleSheetTouchEnd = useCallback(() => {
    if (!sheetTouchStartRef.current) return

    const closeThreshold = 100 // minimum distance to close

    if (sheetDragOffset > closeThreshold) {
      // Continue the animation to close
      closeWithAnimation()
    } else {
      // Snap back with animation
      setSheetDragOffset(0)
    }

    sheetTouchStartRef.current = null
  }, [sheetDragOffset, closeWithAnimation])

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
    setLoadProgress({ loaded: 0, total: 0 })
    setImageBlobUrl(null)
  }, [image.path])

  // Cleanup blob URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl)
      }
    }
  }, [imageBlobUrl])

  // Fetch image with progress tracking (only for non-video and non-PDF)
  useEffect(() => {
    if (isVideo || isPdf || !isOpen) return

    const controller = new AbortController()

    const fetchImageWithProgress = async () => {
      try {
        const response = await fetch(`/${image.path}`, { signal: controller.signal })

        if (!response.ok) throw new Error('Failed to load image')

        const contentLength = response.headers.get('Content-Length')
        const total = contentLength ? parseInt(contentLength, 10) : image.bytes || 0

        if (!response.body) {
          // Fallback: no streaming support, just wait for full load
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          setImageBlobUrl(url)
          setLoadProgress({ loaded: total, total })
          return
        }

        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let loaded = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          chunks.push(value)
          loaded += value.length
          setLoadProgress({ loaded, total })
        }

        // Combine chunks into blob
        const blob = new Blob(chunks)
        const url = URL.createObjectURL(blob)
        setImageBlobUrl(url)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error loading image:', err)
          setIsLoading(false)
        }
      }
    }

    fetchImageWithProgress()

    return () => {
      controller.abort()
    }
  }, [image.path, isVideo, isPdf, isOpen])

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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="inset-0 w-full max-w-full h-full p-0 border-none sm:max-w-full bg-transparent [&[data-state=open]]:animate-none [&[data-state=closed]]:animate-none"
        side="right"
        hideCloseButton
        aria-describedby={undefined}
      >
        {/* Accessibility: visually hidden title for screen readers */}
        <SheetTitle className="sr-only">
          {fileName}
        </SheetTitle>

        {/* Custom close button with proper z-index */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col md:flex-row h-full animate-in fade-in duration-300">
          {/* Image Area */}
          <div
            ref={imageContainerRef}
            className="flex-1 flex items-center justify-center p-4 relative h-1/2 md:h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >

            {/* Main Media (Image, Video, or PDF) */}
            {isPdf ? (
              <div className="absolute inset-4 bottom-16 overflow-y-auto bg-gray-100 dark:bg-gray-900 rounded-lg">
                <PdfViewer url={`/${image.path}`} />
              </div>
            ) : (
            <div
              className="max-w-full max-h-full flex items-center justify-center relative transition-transform duration-150 ease-out"
              style={{ transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined }}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                    {isVideo ? (
                      <span className="text-white text-sm">Loading video...</span>
                    ) : loadProgress.total > 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-white text-sm">
                          {formatFileSize(loadProgress.loaded)} / {formatFileSize(loadProgress.total)}
                        </span>
                        <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-150"
                            style={{ width: `${Math.round((loadProgress.loaded / loadProgress.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-white/60 text-xs">
                          {Math.round((loadProgress.loaded / loadProgress.total) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-white text-sm">Loading image...</span>
                    )}
                  </div>
                </div>
              )}
              {isVideo ? (
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
              ) : imageBlobUrl ? (
                <img
                  ref={imgRef}
                  src={imageBlobUrl}
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
              ) : null}
            </div>
            )}

            {/* Navigation Bar */}
            <div className="absolute bottom-4 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 text-white px-4 py-2 rounded-full z-10">
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

          {/* Metadata Sidebar / Bottom Sheet */}
          <div
            className={`w-full md:w-96 h-1/2 md:h-full bg-white dark:bg-black flex flex-col rounded-t-2xl md:rounded-none shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:shadow-none animate-in slide-in-from-bottom duration-300 md:animate-none ${isClosing ? 'transition-transform duration-300 ease-out' : 'transition-transform duration-150 ease-out'}`}
            style={{ transform: sheetDragOffset ? `translateY(${sheetDragOffset}px)` : undefined }}
          >
            {/* Mobile drag handle - tappable to close, draggable */}
            <div
              className="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
              onClick={closeWithAnimation}
            >
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            <div className="flex-1 px-6 py-4 md:py-6 overflow-y-auto">
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
                      <div className="relative flex-1">
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
                      <div className="relative flex-1">
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

                    {/* Peel - only for images, not PDFs */}
                    {!isPdf && (
                      <div className="flex items-center gap-2">
                        <PeelLogo className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground flex-shrink-0 w-10">Peel</span>
                        <div className="relative flex-1 min-w-0">
                          <a
                            href={peelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-2 pr-8 py-1 text-xs border rounded bg-muted/50 text-muted-foreground truncate hover:bg-muted/70 transition-colors cursor-pointer"
                            title={peelUrl}
                          >
                            {peelUrl}
                          </a>
                          <button
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              copyToClipboard(peelUrl, 'Peel URL')
                            }}
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

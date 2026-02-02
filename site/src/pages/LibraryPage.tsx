import { useState, useCallback, useMemo, memo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { filterToUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useFilter } from '@/components/app-sidebar'
import { useSidebar } from '@/components/ui/sidebar'
import { ImageLightbox } from '@/components/image-lightbox'
import { MetadataEditor } from '@/components/metadata-editor'
import { Check, Play } from 'lucide-react'
import type { ImageMetadata } from '@/types'

// Utility function to get thumbnail path - memoized
const getThumbnailPath = (imagePath: string): string => {
  // Convert assets/folder/image.jpg -> assets-thumbs/folder/image.jpg
  // For videos, use .webp extension for animated thumbnails
  const pathWithoutExt = imagePath.replace(/\.[^/.]+$/, '')
  const isVideo = /\.(mp4|mov|webm|avi)$/i.test(imagePath)
  const ext = isVideo ? '.webp' : '.jpg'
  const thumbnailPath = pathWithoutExt.replace(/^assets\//, 'assets-thumbs/') + ext
  return `/${thumbnailPath}`
}

// Memoized image grid item component
interface ImageGridItemProps {
  image: ImageMetadata
  isSelected: boolean
  onToggleSelect: (path: string, e: React.MouseEvent) => void
  onOpenLightbox: (image: ImageMetadata) => void
}

const ImageGridItem = memo(({ image, isSelected, onToggleSelect, onOpenLightbox }: ImageGridItemProps) => {
  const thumbnailPath = useMemo(() => getThumbnailPath(image.path), [image.path])
  const isPdf = image.isPdf || /\.pdf$/i.test(image.path)

  const gridItemClassName = useMemo(() =>
    `group relative cursor-pointer rounded-xl overflow-hidden transition-all ${
      isSelected
        ? 'ring-[6px] ring-primary'
        : 'hover:ring-[6px] hover:ring-gray-300'
    }`, [isSelected]
  )

  const checkboxClassName = useMemo(() =>
    `absolute top-2 left-2 z-10 transition-opacity ${
      isSelected
        ? 'opacity-100'
        : 'opacity-0 group-hover:opacity-100'
    }`, [isSelected]
  )

  const checkboxInnerClassName = useMemo(() =>
    `w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
      isSelected
        ? 'bg-primary border-primary text-primary-foreground'
        : 'bg-white/90 border-white/90 hover:bg-white'
    }`, [isSelected]
  )

  const fileName = useMemo(() => image.path.split('/').pop(), [image.path])

  return (
    <div
      className={gridItemClassName}
      onClick={() => onOpenLightbox(image)}
    >
      {/* Checkbox for selection */}
      <div
        className={checkboxClassName}
        onClick={(e) => onToggleSelect(image.path, e)}
      >
        <div className={checkboxInnerClassName}>
          {isSelected && (
            <Check className="h-4 w-4" />
          )}
        </div>
      </div>

      <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-xl relative">
        {isPdf ? (
          // Document well container for PDFs
          <div className="absolute inset-0 flex flex-col pt-3 px-3 bg-gray-200 dark:bg-gray-800 rounded-xl">
            <div className="relative flex-1 bg-white dark:bg-gray-900 rounded-t-lg shadow-md flex items-center justify-center p-2">
              <img
                src={thumbnailPath}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                loading="lazy"
                onError={(e) => {
                  // Hide the image on error
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            {/* PDF pill badge - on the gray well */}
            <div className="absolute bottom-2 right-2 bg-red-600 rounded-full px-2 py-0.5">
              <span className="text-white text-xs font-bold">PDF</span>
            </div>
          </div>
        ) : (
          // Regular image/video thumbnail
          <>
            <img
              src={thumbnailPath}
              alt={image.subject || fileName}
              className="w-full h-full object-cover rounded-xl"
              loading="lazy"
              onError={(e) => {
                // Fallback to original image if thumbnail fails to load
                e.currentTarget.src = `/${image.path}`
              }}
            />
            {/* Video play icon overlay */}
            {image.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black dark:bg-white rounded-lg p-3">
                  <Play className="h-6 w-6 text-white dark:text-black fill-white dark:fill-black" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-white text-sm truncate">
            {fileName}
          </div>
          {image.category && image.category.length > 0 && (
            <div className="text-white/80 text-xs">{image.category.join(', ')}</div>
          )}
        </div>
      </div>
    </div>
  )
})

export default function LibraryPage() {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [isEditing, setIsEditing] = useState(false)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showMetadataEditor, setShowMetadataEditor] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<ImageMetadata | null>(null)
  const { selectedFilter, filteredImages, setSelectedFilter } = useFilter()
  const { state: sidebarState } = useSidebar()
  const navigate = useNavigate()
  const { encodedPath } = useParams()

  const { data: images = [], isLoading } = useQuery<ImageMetadata[]>({
    queryKey: ['manifest'],
    queryFn: async () => {
      const res = await fetch('/data/manifest.json')
      if (!res.ok) throw new Error('Failed to load manifest')
      return res.json()
    },
  })

  // Auto-open lightbox for permalink URLs
  useEffect(() => {
    if (encodedPath && images.length > 0 && !lightboxImage) {
      const decodedPath = decodeURIComponent(encodedPath)
      const image = images.find(img => img.path === decodedPath)
      if (image) {
        setLightboxImage(image)
      } else {
        // Image not found, redirect to home
        navigate('/', { replace: true })
      }
    }
  }, [encodedPath, images, lightboxImage, navigate])

  const toggleSelect = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelection = new Set(selectedImages)
    if (newSelection.has(path)) {
      newSelection.delete(path)
    } else {
      newSelection.add(path)
    }
    setSelectedImages(newSelection)
  }, [selectedImages])

  const openLightbox = useCallback((image: ImageMetadata) => {
    setLightboxImage(image)
    // Update URL to permalink
    navigate(`/asset/${encodeURIComponent(image.path)}`, { replace: true })
  }, [navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg">Loading images...</div>
        </div>
      </div>
    )
  }

  if (!images.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg mb-4">No images found</div>
          <div className="text-sm text-muted-foreground">
            Upload images to the assets folder to get started
          </div>
        </div>
      </div>
    )
  }

  const closeLightbox = () => {
    setLightboxImage(null)
    // Navigate back to current filter view, or home if no filter
    const backUrl = selectedFilter ? filterToUrl(selectedFilter) : '/'
    navigate(backUrl, { replace: true })
  }

  const handleLightboxEdit = () => {
    if (lightboxImage) {
      // Select the current image for editing
      setSelectedImages(new Set([lightboxImage.path]))
      // Close lightbox
      setLightboxImage(null)
      // Open metadata editor
      if (!isAuthenticated) {
        setIsEditing(true)
      } else {
        setShowMetadataEditor(true)
      }
    }
  }

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightboxImage) return

    const currentIndex = filteredImages.findIndex(img => img.path === lightboxImage.path)
    let newIndex = currentIndex

    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1
    } else if (direction === 'next' && currentIndex < filteredImages.length - 1) {
      newIndex = currentIndex + 1
    }

    if (newIndex !== currentIndex) {
      const newImage = filteredImages[newIndex]
      setLightboxImage(newImage)
      // Update URL to new asset
      navigate(`/asset/${encodeURIComponent(newImage.path)}`, { replace: true })
    }
  }

  const handleAuth = async () => {
    try {
      const res = await fetch('/api/auth-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shared-Token': password,
        },
      })

      if (res.ok) {
        setIsAuthenticated(true)
        setIsEditing(false)
        setShowMetadataEditor(true)
        toast.success('Authenticated', {
          description: 'You can now edit metadata',
        })
      } else {
        toast.error('Error', {
          description: 'Invalid password',
        })
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to authenticate',
      })
    }
  }

  const startEditing = () => {
    if (selectedImages.size === 0) {
      toast.error('No images selected', {
        description: 'Please select images to edit',
      })
      return
    }

    if (!isAuthenticated) {
      setIsEditing(true)
    } else {
      setShowMetadataEditor(true)
    }
  }

  const handleMetadataSave = async (updates: any[]) => {
    try {
      // Transform updates from nested structure to flat structure expected by backend
      const edits = updates.map(update => ({
        path: update.path,
        category: update.metadata?.category || undefined,
        tags: update.metadata?.tags || undefined,
        person: update.metadata?.person || undefined,
        product: update.metadata?.product || undefined,
      }))

      const response = await fetch('/api/edit-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          edits,
          mode: 'replace' // Use replace mode to overwrite existing metadata
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update metadata')
      }

      // Show success message and reset form state
      toast.success('Updated!', {
        description: 'It may take a few minutes round-trip from GitHub. Go have a coffee ☕',
        duration: 8000, // Show for 8 seconds
      })

      // Reset form state cleanly
      setSelectedImages(new Set())
      setShowMetadataEditor(false)
      setIsAuthenticated(false)
    } catch (error) {
      throw error
    }
  }

  return (
    <>
      <div className="grid auto-rows-min gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredImages.map((image) => (
          <ImageGridItem
            key={image.path}
            image={image}
            isSelected={selectedImages.has(image.path)}
            onToggleSelect={toggleSelect}
            onOpenLightbox={openLightbox}
          />
        ))}
      </div>

      {/* Floating Selection Controls */}
      {selectedImages.size > 0 && (
        <div className={`fixed bottom-6 left-1/2 z-40 ${sidebarState === 'collapsed' ? 'transform -translate-x-1/2' : ''}`}>
          <div className="bg-white/95 dark:bg-black/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {selectedImages.size} selected
              </span>
              <Button onClick={startEditing} size="sm">
                Edit Metadata
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Dialog */}
      {isEditing && !isAuthenticated && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-black p-6 rounded-lg max-w-md w-full mx-4 border dark:border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Enter Password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Authentication required to edit metadata for {selectedImages.size} image(s)
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md mb-4 bg-white dark:bg-black dark:border-gray-700 text-black dark:text-white"
              placeholder="Enter admin password"
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setPassword('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAuth}>
                Authenticate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          image={lightboxImage}
          images={filteredImages}
          isOpen={!!lightboxImage}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
          onEditMetadata={handleLightboxEdit}
          onFilterSelect={setSelectedFilter}
        />
      )}

      {/* Metadata Editor */}
      <MetadataEditor
        selectedImages={Array.from(selectedImages)}
        images={images}
        isOpen={showMetadataEditor}
        onClose={() => setShowMetadataEditor(false)}
        onSave={handleMetadataSave}
      />
    </>
  )
}

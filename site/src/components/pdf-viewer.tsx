import { useState, useRef, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2, FileText } from 'lucide-react'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  url: string
}

interface PageStatus {
  loaded: boolean
  error: boolean
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [documentLoaded, setDocumentLoaded] = useState(false)
  const [documentError, setDocumentError] = useState(false)
  const [pageStatuses, setPageStatuses] = useState<Record<number, PageStatus>>({})
  const [containerWidth, setContainerWidth] = useState(600) // Default width
  const containerRef = useRef<HTMLDivElement>(null)

  // Track container width for responsive page sizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth - 48
        if (width > 0) {
          setContainerWidth(width)
        }
      }
    }
    // Initial measurement after a short delay to ensure container is rendered
    const timer = setTimeout(updateWidth, 50)
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log(`PDF loaded: ${numPages} pages`)
    setNumPages(numPages)
    setDocumentLoaded(true)
    // Initialize all pages as not loaded
    const initialStatuses: Record<number, PageStatus> = {}
    for (let i = 1; i <= numPages; i++) {
      initialStatuses[i] = { loaded: false, error: false }
    }
    setPageStatuses(initialStatuses)
  }, [])

  const handleDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error)
    setDocumentError(true)
  }, [])

  const handlePageLoadSuccess = useCallback((pageNumber: number) => {
    console.log(`Page ${pageNumber} loaded`)
    setPageStatuses(prev => ({
      ...prev,
      [pageNumber]: { loaded: true, error: false }
    }))
  }, [])

  const handlePageLoadError = useCallback((pageNumber: number, error: Error) => {
    console.error(`Page ${pageNumber} error:`, error)
    setPageStatuses(prev => ({
      ...prev,
      [pageNumber]: { loaded: false, error: true }
    }))
  }, [])

  // Calculate loading progress
  const loadedPages = Object.values(pageStatuses).filter(s => s.loaded).length
  const loadingProgress = numPages > 0 ? Math.round((loadedPages / numPages) * 100) : 0
  const isStillLoading = documentLoaded && loadedPages < numPages

  // Calculate page width - max 800px, responsive to container
  const pageWidth = Math.min(containerWidth, 800)

  if (documentError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
        <FileText className="h-12 w-12 text-gray-300" />
        <p>Failed to load PDF</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full min-h-full flex flex-col">
      {/* Loading progress bar - fixed at top of PDF viewer */}
      {isStillLoading && (
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 p-4 shadow-md">
          <div className="flex items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
              {loadedPages} / {numPages} pages
            </span>
          </div>
        </div>
      )}

      {/* Initial document loading state */}
      {!documentLoaded && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <span className="text-base text-gray-500">Loading PDF document...</span>
          <span className="text-xs text-gray-400">Large files may take a moment</span>
        </div>
      )}

      <Document
        file={url}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={null} // We handle loading ourselves above
      >
        {documentLoaded && (
          <div className="flex flex-col items-center gap-8 py-6 px-4">
            {Array.from({ length: numPages }, (_, i) => {
              const pageNumber = i + 1
              const status = pageStatuses[pageNumber]
              const isPageLoading = !status?.loaded && !status?.error

              return (
                <div
                  key={pageNumber}
                  className="relative"
                  style={{
                    width: pageWidth,
                    minHeight: Math.round(pageWidth * 1.3)
                  }}
                >
                  {/* Page container with shadow */}
                  <div className="bg-white shadow-xl rounded overflow-hidden">
                    {/* Page loading placeholder */}
                    {isPageLoading && (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10"
                        style={{
                          width: pageWidth,
                          height: Math.round(pageWidth * 1.3)
                        }}
                      >
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
                        <span className="text-sm text-gray-500 font-medium">Loading page {pageNumber}</span>
                        <span className="text-xs text-gray-400 mt-1">of {numPages}</span>
                      </div>
                    )}

                    {/* Error state */}
                    {status?.error && (
                      <div
                        className="flex flex-col items-center justify-center bg-gray-100"
                        style={{
                          width: pageWidth,
                          height: Math.round(pageWidth * 1.3)
                        }}
                      >
                        <FileText className="h-8 w-8 text-gray-300 mb-2" />
                        <span className="text-sm text-gray-500">Failed to load page {pageNumber}</span>
                      </div>
                    )}

                    <Page
                      pageNumber={pageNumber}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onLoadSuccess={() => handlePageLoadSuccess(pageNumber)}
                      onLoadError={(error) => handlePageLoadError(pageNumber, error)}
                      loading={null}
                    />
                  </div>

                  {/* Page number indicator */}
                  <div className="text-center mt-2">
                    <span className="text-xs text-gray-400">Page {pageNumber}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Document>
    </div>
  )
}

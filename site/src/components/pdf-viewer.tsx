import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  src: string
  className?: string
}

export function PdfViewer({ src, className = '' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageLoading(false)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF')
    setPageLoading(false)
  }, [])

  const onPageLoadSuccess = useCallback(() => {
    setPageLoading(false)
  }, [])

  const goToPrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1))
    setPageLoading(true)
  }, [])

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(numPages || prev, prev + 1))
    setPageLoading(true)
  }, [numPages])

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 text-white ${className}`}>
        <FileText className="h-16 w-16 text-gray-400" />
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* PDF Document */}
      <div className="relative max-h-full overflow-auto">
        {pageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="text-white text-sm">
                {numPages ? `Loading page ${currentPage}...` : 'Loading PDF...'}
              </span>
            </div>
          </div>
        )}

        <Document
          file={src}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex justify-center"
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            onLoadSuccess={onPageLoadSuccess}
            loading={null}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-lg"
          />
        </Document>
      </div>

      {/* Page Navigation */}
      {numPages && numPages > 1 && (
        <div className="flex items-center gap-4 mt-4 bg-black/50 text-white px-4 py-2 rounded-full">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/20 text-white disabled:opacity-50"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span className="text-sm font-medium min-w-[80px] text-center">
            {currentPage} of {numPages}
          </span>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/20 text-white disabled:opacity-50"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* PDF indicator pill */}
      {numPages && (
        <div className="mt-2 px-3 py-1 bg-red-500/80 text-white text-xs font-medium rounded-full flex items-center gap-1">
          <FileText className="h-3 w-3" />
          PDF
        </div>
      )}
    </div>
  )
}

export interface ImageMetadata {
  path: string
  w: number
  h: number
  bytes: number
  dateTaken?: string
  camera?: {
    make?: string
    model?: string
  }
  category?: string[]
  tags?: string[]
  person?: string[]
  product?: string[]
  hierarchical?: string[]
  duration?: number
  isVideo?: boolean
  isPdf?: boolean
}

export interface EditPayload {
  edits: Array<{
    path: string
    category?: string[]
    tags?: string[]
    person?: string[]
    product?: string[]
  }>
  mode: 'merge' | 'replace'
}

export interface DownloadOptions {
  path: string
  format: 'jpeg' | 'webp' | 'avif' | 'png'
  width?: number
  quality?: number
}

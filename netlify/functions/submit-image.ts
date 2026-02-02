const { App } = require('@octokit/app')
const Busboy = require('busboy')

interface ParsedFile {
  buffer: Buffer
  filename: string
  mimeType: string
}

interface ParsedForm {
  file?: ParsedFile
  filename?: string
  subfolder?: string
  category?: string[]
  person?: string[]
  tags?: string[]
  product?: string[]
}

interface Metadata {
  category?: string[]
  person?: string[]
  tags?: string[]
  product?: string[]
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB - GitHub blob limit

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
]

// Magic bytes for image validation
const IMAGE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header, need to check for WEBP
  'image/tiff': [0x49, 0x49, 0x2a, 0x00], // Little-endian TIFF
}

const TIFF_BIG_ENDIAN = [0x4d, 0x4d, 0x00, 0x2a]

function detectImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null

  // Check JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  // Check PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }

  // Check GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif'
  }

  // Check WebP (RIFF....WEBP)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'image/webp'
    }
  }

  // Check TIFF (little-endian)
  if (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) {
    return 'image/tiff'
  }

  // Check TIFF (big-endian)
  if (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a) {
    return 'image/tiff'
  }

  return null
}

function sanitizeFilename(filename: string): string {
  // Remove path components, keep only the filename
  const base = filename.split('/').pop()?.split('\\').pop() || 'image'

  // Remove dangerous characters, keep alphanumeric, dots, hyphens, underscores
  const sanitized = base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+/, '')
    .substring(0, 100)

  return sanitized || 'image.jpg'
}

function parseJsonArray(value?: string): string[] | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed
    }
  } catch {
    // If not valid JSON, treat as comma-separated
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }
  return undefined
}

function buildPrBody(path: string, metadata: Metadata, hasMetadata: boolean): string {
  let body = `## Submitted via API\n\n**File**: \`${path}\`\n`

  if (hasMetadata) {
    body += `\n### Metadata (to embed after merge)\n`
    if (metadata.category?.length) {
      body += `- **Category**: ${metadata.category.join(', ')}\n`
    }
    if (metadata.person?.length) {
      body += `- **Person**: ${metadata.person.join(', ')}\n`
    }
    if (metadata.tags?.length) {
      body += `- **Tags**: ${metadata.tags.join(', ')}\n`
    }
    if (metadata.product?.length) {
      body += `- **Product**: ${metadata.product.join(', ')}\n`
    }

    // Add machine-readable metadata as HTML comment
    const metadataJson = JSON.stringify(metadata)
    body += `\n<!-- metadata:${metadataJson} -->\n`
  }

  return body
}

async function parseMultipartForm(event: any): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const result: ParsedForm = {}
    const chunks: Buffer[] = []

    const contentType = event.headers['content-type'] || event.headers['Content-Type']
    if (!contentType?.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'))
      return
    }

    const busboy = Busboy({
      headers: { 'content-type': contentType },
      limits: { fileSize: MAX_FILE_SIZE },
    })

    busboy.on('file', (fieldname: string, file: any, info: any) => {
      const { filename, mimeType } = info

      if (fieldname === 'file') {
        const fileChunks: Buffer[] = []

        file.on('data', (data: Buffer) => {
          fileChunks.push(data)
        })

        file.on('end', () => {
          result.file = {
            buffer: Buffer.concat(fileChunks),
            filename: filename || 'image',
            mimeType,
          }
        })

        file.on('limit', () => {
          reject(new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`))
        })
      }
    })

    busboy.on('field', (fieldname: string, value: string) => {
      switch (fieldname) {
        case 'filename':
          result.filename = value
          break
        case 'subfolder':
          result.subfolder = value
          break
        case 'category':
          result.category = parseJsonArray(value)
          break
        case 'person':
          result.person = parseJsonArray(value)
          break
        case 'tags':
          result.tags = parseJsonArray(value)
          break
        case 'product':
          result.product = parseJsonArray(value)
          break
      }
    })

    busboy.on('finish', () => {
      resolve(result)
    })

    busboy.on('error', (error: Error) => {
      reject(error)
    })

    // Decode base64 if needed
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body)

    busboy.end(body)
  })
}

function formatPrivateKey(key: string): string {
  // If key already has newlines, just clean up any \n literals
  if (key.includes('\n') && !key.startsWith('-----BEGIN')) {
    return key.replace(/\\n/g, '\n')
  }

  // If key is on single line with spaces, reformat it
  // Format: -----BEGIN RSA PRIVATE KEY----- BASE64... -----END RSA PRIVATE KEY-----
  const match = key.match(/^(-----BEGIN [A-Z ]+ KEY-----)\s+(.+)\s+(-----END [A-Z ]+ KEY-----)$/)
  if (match) {
    const [, header, body, footer] = match
    // Split body into 64-char lines (PEM format)
    const bodyLines = body.replace(/\s+/g, '').match(/.{1,64}/g) || []
    return [header, ...bodyLines, footer].join('\n')
  }

  // Fallback: just replace literal \n
  return key.replace(/\\n/g, '\n')
}

async function getInstallationOctokit() {
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_INSTALLATION_ID || !process.env.GITHUB_PRIVATE_KEY) {
    throw new Error('GitHub App not configured')
  }

  const privateKey = formatPrivateKey(process.env.GITHUB_PRIVATE_KEY)

  const app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey,
  })

  return app.getInstallationOctokit(parseInt(process.env.GITHUB_INSTALLATION_ID))
}

exports.handler = async (event: any) => {
  // CORS headers for cross-origin requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    }
  }

  try {
    // Parse multipart form
    const form = await parseMultipartForm(event)

    if (!form.file) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'No file provided' }),
      }
    }

    // Validate file size
    if (form.file.buffer.length > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        }),
      }
    }

    // Validate image type by magic bytes
    const detectedType = detectImageType(form.file.buffer)
    if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Invalid image type. Allowed: JPEG, PNG, WebP, GIF, TIFF',
        }),
      }
    }

    // Determine filename and path
    const subfolder = form.subfolder?.replace(/[^a-zA-Z0-9/_-]/g, '') || 'incoming'
    const rawFilename = form.filename || form.file.filename
    let sanitizedFilename = sanitizeFilename(rawFilename)

    // Ensure correct extension based on detected type
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/tiff': '.tiff',
    }
    const expectedExt = extensions[detectedType]
    if (!sanitizedFilename.toLowerCase().endsWith(expectedExt)) {
      const baseName = sanitizedFilename.replace(/\.[^.]+$/, '')
      sanitizedFilename = baseName + expectedExt
    }

    const filePath = `assets/${subfolder}/${sanitizedFilename}`

    // Prepare metadata
    const metadata: Metadata = {
      category: form.category,
      person: form.person,
      tags: form.tags,
      product: form.product,
    }
    const hasMetadata = Object.values(metadata).some(arr => arr && arr.length > 0)

    // Get GitHub client
    const octokit = await getInstallationOctokit()
    const owner = process.env.REPO_OWNER!
    const repo = process.env.REPO_NAME!

    console.log(`Creating PR to add ${filePath} to ${owner}/${repo}`)

    // 1. Create blob
    const blob = await octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
      owner,
      repo,
      content: form.file.buffer.toString('base64'),
      encoding: 'base64',
    })
    console.log('Blob created:', blob.data.sha)

    // 2. Get main branch ref
    const mainRef = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
      owner,
      repo,
      ref: 'heads/main',
    })
    const mainCommitSha = mainRef.data.object.sha
    console.log('Main commit SHA:', mainCommitSha)

    // 3. Get current tree
    const commit = await octokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
      owner,
      repo,
      commit_sha: mainCommitSha,
    })
    const treeSha = commit.data.tree.sha

    // 4. Create new tree with image
    const newTree = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
      owner,
      repo,
      base_tree: treeSha,
      tree: [
        {
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: blob.data.sha,
        },
      ],
    })
    console.log('New tree created:', newTree.data.sha)

    // 5. Create commit
    const newCommit = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
      owner,
      repo,
      message: `feat(asset): add ${sanitizedFilename}`,
      tree: newTree.data.sha,
      parents: [mainCommitSha],
    })
    console.log('New commit created:', newCommit.data.sha)

    // 6. Create branch
    const branchName = `submit/${subfolder}-${Date.now()}`
    await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: newCommit.data.sha,
    })
    console.log('Branch created:', branchName)

    // 7. Create PR
    const prBody = buildPrBody(filePath, metadata, hasMetadata)
    const pr = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
      owner,
      repo,
      title: `Add image: ${sanitizedFilename}`,
      head: branchName,
      base: 'main',
      body: prBody,
    })
    console.log('PR created:', pr.data.html_url)

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        pr_url: pr.data.html_url,
        branch: branchName,
        filename: filePath,
      }),
    }
  } catch (error) {
    console.error('Submit image error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
      }),
    }
  }
}

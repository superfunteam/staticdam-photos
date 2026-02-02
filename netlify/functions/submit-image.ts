import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { Octokit } from '@octokit/rest'

// Format private key - handles both \n escape sequences and space-separated PEM format
function formatPrivateKey(key: string): string {
  // First, handle escaped newlines
  let formatted = key.replace(/\\n/g, '\n')

  // Check if it's in space-separated format (no newlines after header)
  if (!formatted.includes('\n-----') && formatted.includes(' -----')) {
    // Split by spaces and reconstruct with newlines
    const parts = formatted.split(' ')
    formatted = parts.join('\n')
  }

  // Ensure proper PEM format
  if (!formatted.startsWith('-----BEGIN')) {
    formatted = '-----BEGIN RSA PRIVATE KEY-----\n' + formatted
  }
  if (!formatted.endsWith('-----')) {
    formatted = formatted + '\n-----END RSA PRIVATE KEY-----'
  }

  return formatted
}

// Parse multipart form data
async function parseMultipartFormData(event: HandlerEvent): Promise<{
  fields: Record<string, string>
  files: Array<{ name: string; filename: string; content: Buffer; contentType: string }>
}> {
  const contentType = event.headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary=(.+)/)

  if (!boundaryMatch) {
    throw new Error('No boundary found in content-type')
  }

  const boundary = boundaryMatch[1]
  const body = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64')
    : Buffer.from(event.body || '', 'utf-8')

  const fields: Record<string, string> = {}
  const files: Array<{ name: string; filename: string; content: Buffer; contentType: string }> = []

  const parts = body.toString('binary').split(`--${boundary}`)

  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--') continue

    const headerEndIndex = part.indexOf('\r\n\r\n')
    if (headerEndIndex === -1) continue

    const headers = part.substring(0, headerEndIndex)
    const content = part.substring(headerEndIndex + 4).replace(/\r\n$/, '')

    const nameMatch = headers.match(/name="([^"]+)"/)
    const filenameMatch = headers.match(/filename="([^"]+)"/)
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/)

    if (nameMatch) {
      const name = nameMatch[1]
      if (filenameMatch) {
        files.push({
          name,
          filename: filenameMatch[1],
          content: Buffer.from(content, 'binary'),
          contentType: contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream'
        })
      } else {
        fields[name] = content.trim()
      }
    }
  }

  return { fields, files }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Check content length (max 25MB)
  const contentLength = parseInt(event.headers['content-length'] || '0', 10)
  if (contentLength > 25 * 1024 * 1024) {
    return {
      statusCode: 413,
      body: JSON.stringify({ error: 'File too large. Maximum size is 25MB.' })
    }
  }

  try {
    // Parse form data
    const { fields, files } = await parseMultipartFormData(event)

    if (files.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No file uploaded' })
      }
    }

    const file = files[0]
    const folder = fields.folder || 'uploads'
    const description = fields.description || ''

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.contentType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF' })
      }
    }

    // Get GitHub credentials from environment
    const appId = process.env.GITHUB_APP_ID
    const privateKey = process.env.GITHUB_PRIVATE_KEY
    const installationId = process.env.GITHUB_INSTALLATION_ID
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO

    if (!appId || !privateKey || !installationId || !owner || !repo) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GitHub integration not configured' })
      }
    }

    // Create Octokit instance with GitHub App authentication
    const { createAppAuth } = await import('@octokit/auth-app')

    const auth = createAppAuth({
      appId: parseInt(appId, 10),
      privateKey: formatPrivateKey(privateKey),
      installationId: parseInt(installationId, 10)
    })

    const { token } = await auth({ type: 'installation' })

    const octokit = new Octokit({ auth: token })

    // Get the default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo })
    const defaultBranch = repoData.default_branch

    // Get the latest commit on the default branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`
    })

    // Create a new branch for this submission
    const branchName = `submit-image-${Date.now()}`
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: refData.object.sha
    })

    // Sanitize filename
    const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `assets/${folder}/${sanitizedFilename}`

    // Create the file in the new branch
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Add ${sanitizedFilename} via web upload`,
      content: file.content.toString('base64'),
      branch: branchName
    })

    // Create a pull request
    const prBody = `## Image Submission

**File:** \`${filePath}\`
**Folder:** ${folder}
${description ? `**Description:** ${description}` : ''}

---
*Submitted via StaticDAM web upload*`

    const { data: prData } = await octokit.pulls.create({
      owner,
      repo,
      title: `Add image: ${sanitizedFilename}`,
      head: branchName,
      base: defaultBranch,
      body: prBody
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Image submitted successfully',
        prUrl: prData.html_url,
        prNumber: prData.number
      })
    }
  } catch (error) {
    console.error('Error submitting image:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to submit image',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

export { handler }

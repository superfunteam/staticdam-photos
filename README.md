# Static DAM

A Git-native Digital Asset Management system with EXIF-only metadata storage.

## Features

- **Git-native**: All images and metadata stored in Git
- **EXIF-embedded metadata**: All taxonomy lives inside image files (portable)
- **Static site**: Fast React frontend with Vite + Tailwind + ShadCN
- **On-demand exports**: Dynamic resize/transcode without repo bloat
- **Simple auth**: Single shared password for write access
- **Public gallery**: Read access is fully public

## Architecture

```
GitHub Repo → Netlify Deploy
├─ /assets/**        # Original images and videos with embedded metadata
├─ /data/manifest    # Generated index (cache)
├─ /site             # React frontend
└─ /netlify/functions # API endpoints
```

## Setup

### 1. Environment Variables (Netlify)

```bash
SHARED_WRITE_HASH=         # Argon2 hash of shared password
SESSION_SIGNING_KEY=       # Random 32+ byte key
GITHUB_APP_ID=            # GitHub App ID
GITHUB_INSTALLATION_ID=   # GitHub App Installation ID
GITHUB_PRIVATE_KEY=       # GitHub App private key
REPO_OWNER=              # GitHub username/org
REPO_NAME=               # Repository name
PUBLIC_BASE_URL=         # Deployed site URL
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Development

```bash
pnpm dev
```

## Metadata Fields (All Multi-Value)

All metadata fields support multiple values and are stored in dedicated EXIF fields with no prefixes needed.

| Field | EXIF Field | Purpose | Example Values |
|-------|------------|---------|----------------|
| `category` | `IPTC:SupplementalCategories` | Image categories | `["portrait", "warehouse", "outdoor"]` |
| `person` | `XMP-iptcExt:PersonInImage` | People in the image | `["Jimmy", "Marcus", "Sasha"]` |
| `tags` | `IPTC:Keywords` | Descriptive keywords | `["professional", "equipment", "lighting"]` |
| `product` | `XMP-lr:HierarchicalSubject` | Product associations | `["laptop", "camera", "monitor"]` |

### Adding Metadata

Each metadata type uses its own dedicated EXIF field - no prefixes or mixing required:

```bash
# Categories (IPTC:SupplementalCategories)
exiftool -IPTC:SupplementalCategories="portrait" image.jpg
exiftool -IPTC:SupplementalCategories="warehouse" image.jpg

# People (XMP-iptcExt:PersonInImage)
exiftool -XMP-iptcExt:PersonInImage="Jimmy" image.jpg
exiftool -XMP-iptcExt:PersonInImage="Marcus" image.jpg

# Tags (IPTC:Keywords)
exiftool -IPTC:Keywords="professional" image.jpg
exiftool -IPTC:Keywords="equipment" image.jpg

# Products (XMP-lr:HierarchicalSubject)
exiftool -XMP-lr:HierarchicalSubject="laptop" image.jpg
exiftool -XMP-lr:HierarchicalSubject="camera" image.jpg
```

### Benefits of Dedicated Fields

- **No prefix confusion** - each field contains only its type
- **Standards compliant** - using EXIF fields for intended purposes
- **Tool compatibility** - other DAM software will understand the data
- **Simpler parsing** - no string manipulation needed

## Workflow

1. **Upload images** to `/assets/**`
2. **GitHub Action** reads EXIF → builds manifest
3. **Frontend** loads manifest for fast browsing
4. **Edit metadata** via UI (requires password)
5. **Changes embedded** in image files via exiftool
6. **Download variants** generated on-demand

## License

MIT
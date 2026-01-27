# ContentForge - Deployment Guide

> **Version:** 1.0.0
> **Last Updated:** January 2026
> **Status:** Active Development

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Build](#production-build)
4. [Vercel Deployment](#vercel-deployment)
5. [Netlify Deployment](#netlify-deployment)
6. [Docker Deployment](#docker-deployment)
7. [GitHub Pages Deployment](#github-pages-deployment)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended | Purpose |
|---|---|---|---|
| **Node.js** | 18.0.0 | 20.x LTS | JavaScript runtime |
| **npm** | 9.0.0 | 10.x | Package manager |
| **Git** | 2.30+ | Latest | Version control |

### Optional Software

| Software | Version | Purpose |
|---|---|---|
| **Docker** | 20.10+ | Containerized deployment |
| **Docker Compose** | 2.0+ | Multi-container orchestration |
| **Vercel CLI** | Latest | Vercel deployment |
| **Netlify CLI** | Latest | Netlify deployment |

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Expected output: v18.x.x or higher

# Check npm version
npm --version
# Expected output: 9.x.x or higher

# Check Git version
git --version
# Expected output: git version 2.30.x or higher
```

---

## Local Development

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-username/content-forge.git
cd content-forge

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

### Development Server

```bash
npm run dev
```

This starts the Vite development server with:
- **Hot Module Replacement (HMR):** Instant updates on file changes
- **Default URL:** `http://localhost:5173`
- **Network Access:** Available on local network via `--host` flag

```bash
# Start with network access (for testing on other devices)
npm run dev -- --host

# Start on a specific port
npm run dev -- --port 3000
```

### Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start development server with HMR |
| `build` | `npm run build` | Create production build |
| `preview` | `npm run preview` | Preview production build locally |
| `lint` | `npm run lint` | Run ESLint on all source files |
| `type-check` | `npm run type-check` | Run TypeScript compiler checks |

---

## Production Build

### Build Command

```bash
npm run build
```

This executes:
1. TypeScript type checking
2. Vite production build with Rollup
3. Asset optimization (minification, tree-shaking, code splitting)
4. Output to `dist/` directory

### Build Output

```
dist/
├── assets/
│   ├── index-[hash].js        # Main application bundle
│   ├── index-[hash].css       # Compiled CSS (Tailwind)
│   ├── vendor-[hash].js       # Vendor dependencies (React, etc.)
│   └── [font-files]           # Font assets (if self-hosted)
├── index.html                 # Entry HTML file
├── favicon.ico
└── robots.txt
```

### Preview Production Build

```bash
npm run preview
```

Serves the `dist/` directory on `http://localhost:4173` for local testing before deployment.

---

## Vercel Deployment

Vercel is the recommended deployment platform for ContentForge due to its native Vite support and zero-configuration deployment.

### Option 1: Vercel Dashboard (Recommended)

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project"
   - Import your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure Build Settings:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

3. **Set Environment Variables:**
   - Navigate to Project Settings > Environment Variables
   - Add all required environment variables (see [Environment Variables Reference](#environment-variables-reference))

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Subsequent pushes to `main` will trigger automatic deployments

### Option 2: Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time - will prompt for configuration)
vercel

# Deploy to production
vercel --prod

# Deploy with environment variables
vercel --env VITE_AI_PROVIDER=simulated
```

### Vercel Configuration File (Optional)

Create `vercel.json` in the project root for advanced configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!assets/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## Netlify Deployment

### Option 1: Drag & Drop

1. Run `npm run build` locally
2. Go to [app.netlify.com](https://app.netlify.com)
3. Drag the `dist/` folder onto the Netlify dashboard
4. Your site is live immediately

### Option 2: Git Integration

1. **Connect Repository:**
   - Log in to Netlify
   - Click "New site from Git"
   - Select your repository

2. **Configure Build Settings:**
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Node Version:** 18 (set in environment variables as `NODE_VERSION=18`)

3. **Deploy:**
   - Click "Deploy site"
   - Automatic deployments on push to `main`

### Option 3: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize project (first time)
netlify init

# Build and deploy
npm run build && netlify deploy

# Deploy to production
npm run build && netlify deploy --prod
```

### SPA Redirect Configuration

ContentForge uses client-side routing (React Router), so all routes must redirect to `index.html`. Create a `_redirects` file in the `public/` directory:

```
# public/_redirects
/*    /index.html    200
```

Alternatively, create a `netlify.toml` file in the project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

---

## Docker Deployment

### Dockerfile

Create a `Dockerfile` in the project root with a multi-stage build:

```dockerfile
# ============================================
# Stage 1: Build the application
# ============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --silent

# Copy source code
COPY . .

# Set build-time environment variables
ARG VITE_AI_PROVIDER=simulated
ARG VITE_APP_NAME=ContentForge
ENV VITE_AI_PROVIDER=$VITE_AI_PROVIDER
ENV VITE_APP_NAME=$VITE_APP_NAME

# Build the application
RUN npm run build

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

Create an `nginx.conf` file in the project root:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    # Cache static assets aggressively
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA fallback - route all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### Docker Commands

```bash
# Build the Docker image
docker build -t contentforge:latest .

# Run the container
docker run -d -p 8080:80 --name contentforge contentforge:latest

# Run with environment variables (build-time)
docker build \
  --build-arg VITE_AI_PROVIDER=simulated \
  --build-arg VITE_APP_NAME=ContentForge \
  -t contentforge:latest .

# View logs
docker logs contentforge

# Stop and remove
docker stop contentforge && docker rm contentforge
```

### Docker Compose

Create a `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  contentforge:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_AI_PROVIDER: simulated
        VITE_APP_NAME: ContentForge
    container_name: contentforge
    ports:
      - "8080:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  # Optional: Watchtower for automatic updates
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=300
    restart: unless-stopped
```

```bash
# Start with Docker Compose
docker compose up -d

# Rebuild and start
docker compose up -d --build

# View logs
docker compose logs -f contentforge

# Stop all services
docker compose down
```

---

## GitHub Pages Deployment

### Setup

GitHub Pages serves static files from a branch. Since ContentForge is an SPA with client-side routing, a custom 404 page is needed.

### Step 1: Configure Vite Base URL

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Set base to your repository name for GitHub Pages
  base: '/content-forge/',
});
```

### Step 2: Add 404 Redirect

Create `public/404.html` to handle SPA routing on GitHub Pages:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>ContentForge</title>
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // https://github.com/rafgraph/spa-github-pages
      var pathSegmentsToKeep = 1;
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body></body>
</html>
```

### Step 3: Deploy with gh-pages

```bash
# Install gh-pages package
npm install -D gh-pages

# Add deploy script to package.json
# "deploy": "npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```

### Step 4: Configure GitHub Repository

1. Go to repository Settings > Pages
2. Set source to "Deploy from a branch"
3. Select `gh-pages` branch, root directory
4. Save

### GitHub Actions Workflow (Alternative)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## Environment Variables Reference

### Complete Variables Table

| Variable | Type | Default | Required | Dev | Prod | Description |
|---|---|---|---|---|---|---|
| `VITE_AI_PROVIDER` | `string` | `simulated` | No | Yes | Yes | Content generation provider |
| `VITE_CLAUDE_API_KEY` | `string` | - | Conditional | Optional | Optional | Anthropic API key |
| `VITE_CLAUDE_MODEL` | `string` | `claude-sonnet-4-20250514` | No | Optional | Optional | Claude model identifier |
| `VITE_APP_NAME` | `string` | `ContentForge` | No | Optional | Optional | Display name |
| `VITE_APP_URL` | `string` | `http://localhost:5173` | No | No | Yes | Production URL |
| `VITE_STORAGE_PREFIX` | `string` | `contentforge` | No | Optional | Optional | localStorage key prefix |
| `NODE_VERSION` | `string` | - | No | No | Platform | Node.js version hint for platforms |

### Environment File Structure

```bash
# .env                  - Default values (committed, no secrets)
# .env.local            - Local overrides (gitignored)
# .env.development      - Development-specific values
# .env.production       - Production-specific values
# .env.production.local - Production secrets (gitignored)
```

### Setting Variables by Platform

**Vercel:**
```bash
vercel env add VITE_AI_PROVIDER
# Or via dashboard: Project Settings > Environment Variables
```

**Netlify:**
```bash
netlify env:set VITE_AI_PROVIDER simulated
# Or via dashboard: Site Settings > Environment Variables
```

**Docker:**
```bash
docker build --build-arg VITE_AI_PROVIDER=simulated -t contentforge .
```

**GitHub Actions:**
```yaml
env:
  VITE_AI_PROVIDER: simulated
```

---

## Performance Optimization

### Build Optimizations

#### Code Splitting

Vite automatically code-splits on dynamic imports. Key split points in ContentForge:

```typescript
// Route-based code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ForgePage = lazy(() => import('./pages/ForgePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
```

#### Tree Shaking

Lucide React icons are imported individually for effective tree shaking:

```typescript
// Good - only imports the specific icon
import { Sparkles } from 'lucide-react';

// Bad - imports the entire library
import * as Icons from 'lucide-react';
```

#### Asset Optimization

Vite configuration for production:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',

    // Enable minification
    minify: 'terser',

    // Chunk size warnings
    chunkSizeWarningLimit: 250,

    // Rollup options for manual chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
        },
      },
    },
  },
});
```

### Runtime Optimizations

#### Font Loading

```html
<!-- Preconnect to Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Load fonts with display=swap for fast text rendering -->
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

#### Image Optimization

- Use WebP format for any raster images
- Lazy load images below the fold
- Provide explicit `width` and `height` attributes to prevent layout shift

#### Animation Performance

- Use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left` (trigger layout)
- Use `will-change` sparingly for known animated elements
- Reduce particle count on low-power devices

### Caching Strategy

| Resource Type | Cache-Control | Duration |
|---|---|---|
| HTML files | `no-cache` | Revalidate on every request |
| JS/CSS (hashed) | `public, max-age=31536000, immutable` | 1 year |
| Fonts | `public, max-age=31536000` | 1 year |
| Images | `public, max-age=86400` | 1 day |

### Lighthouse Target Scores

| Category | Target | Notes |
|---|---|---|
| Performance | > 90 | First Contentful Paint < 2s |
| Accessibility | > 95 | WCAG 2.1 AA compliance |
| Best Practices | > 95 | Security headers, HTTPS |
| SEO | > 90 | Meta tags, semantic HTML |

---

## Troubleshooting

### Common Issues

#### Build Fails with TypeScript Errors

```bash
# Run type checking separately to see all errors
npx tsc --noEmit

# Fix errors, then rebuild
npm run build
```

#### Tailwind CSS Styles Not Loading

1. Verify `tailwind.config.ts` includes all content paths:
   ```typescript
   content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
   ```
2. Verify `globals.css` includes Tailwind directives:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
3. Clear Vite cache: `rm -rf node_modules/.vite`

#### SPA Routing Returns 404 on Refresh

This is expected on static hosts. Apply the redirect rules:
- **Vercel:** Add `rewrites` in `vercel.json`
- **Netlify:** Add `_redirects` file or `netlify.toml`
- **Nginx:** Add `try_files $uri $uri/ /index.html`
- **GitHub Pages:** Add `404.html` redirect script

#### Docker Build Fails

```bash
# Clean Docker cache and rebuild
docker builder prune -f
docker build --no-cache -t contentforge .

# Check available disk space
docker system df
```

#### Environment Variables Not Available

- Vite requires all client-side env vars to start with `VITE_`
- Rebuild after changing `.env` files (HMR does not pick up env changes)
- In Docker, env vars must be passed as `--build-arg` at build time since Vite inlines them

#### Animation Jank / Low FPS

1. Open Chrome DevTools > Performance panel
2. Record during animation
3. Check for layout thrashing (purple bars)
4. Reduce particle count in visualization settings
5. Verify `will-change` is applied to animated elements
6. Test with `prefers-reduced-motion` media query

---

*This deployment guide covers all supported deployment targets for ContentForge. Choose the platform that best fits your infrastructure requirements and team expertise.*

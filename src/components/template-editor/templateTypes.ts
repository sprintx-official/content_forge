// ── Element source types ──
export type ElementSource = 'ai-generated' | 'agent-branding' | 'post-derived' | 'static'

// ── Element types ──
export type ElementType = 'text' | 'image' | 'shape' | 'qr-code' | 'gradient'

// ── Available bindings per source ──
export const SOURCE_BINDINGS: Record<ElementSource, string[]> = {
  'ai-generated': ['background_image', 'image_headline', 'category'],
  'agent-branding': ['logo', 'agent_name'],
  'post-derived': ['qr_url', 'slug', 'published_date'],
  'static': [],
}

// ── Template element ──
export interface TemplateElement {
  id: string
  type: ElementType
  source: ElementSource
  binding?: string

  // Position & size (percentage-based, 0-100)
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  visible: boolean

  properties: {
    // Text
    text?: string
    fontFamily?: string
    fontSize?: number
    fontWeight?: string
    color?: string
    textAlign?: string
    lineHeight?: number
    autoFit?: boolean
    highlightKeywords?: boolean
    highlightColor?: string
    highlightTextColor?: string

    // Image
    imagePath?: string
    adaptToBrightness?: boolean
    darkVariant?: string
    whiteVariant?: string

    // Shape
    fill?: string
    stroke?: string
    strokeWidth?: number
    borderRadius?: number
    opacity?: number

    // QR Code
    urlTemplate?: string
    qrSize?: number
    showCaption?: boolean
    captionText?: string

    // Gradient
    gradientStops?: Array<{ offset: number; color: string }>
    adaptToBackground?: boolean
    direction?: 'vertical' | 'horizontal'
  }
}

// ── Full template ──
export interface ImageTemplate {
  name: string
  squareWidth: number
  squareHeight: number
  landscapeWidth: number
  landscapeHeight: number
  verticalWidth: number
  verticalHeight: number
  elements: TemplateElement[]
}

// ── Canvas sizes ──
export const SQUARE = { width: 1080, height: 1080 }
export const LANDSCAPE = { width: 1200, height: 627 }
export const VERTICAL = { width: 1080, height: 1350 }

// ── Default template — full-bleed image, dark gradient, keyword-yellow headlines ──
export function createDefaultTemplate(): ImageTemplate {
  return {
    name: 'Default',
    squareWidth: SQUARE.width,
    squareHeight: SQUARE.height,
    landscapeWidth: LANDSCAPE.width,
    landscapeHeight: LANDSCAPE.height,
    verticalWidth: VERTICAL.width,
    verticalHeight: VERTICAL.height,
    elements: [
      // Full-bleed AI background
      {
        id: 'background',
        type: 'image',
        source: 'ai-generated',
        binding: 'background_image',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        visible: true,
        properties: {},
      },
      // Dark gradient — bottom half, adapts to background brightness
      {
        id: 'gradient',
        type: 'gradient',
        source: 'static',
        x: 0, y: 45, width: 100, height: 55,
        zIndex: 1,
        visible: true,
        properties: {
          adaptToBackground: true,
          direction: 'vertical',
          gradientStops: [
            { offset: 0, color: 'rgba(0,0,0,0)' },
            { offset: 0.4, color: 'rgba(0,0,0,0.5)' },
            { offset: 1, color: 'rgba(0,0,0,0.85)' },
          ],
        },
      },
      // Logo — top-left, brightness-adaptive
      {
        id: 'logo',
        type: 'image',
        source: 'agent-branding',
        binding: 'logo',
        x: 3, y: 1, width: 12, height: 15,
        zIndex: 10,
        visible: true,
        properties: {
          adaptToBrightness: true,
        },
      },
      // QR code — top-right
      {
        id: 'qr-code',
        type: 'qr-code',
        source: 'post-derived',
        binding: 'qr_url',
        x: 90, y: 2.5, width: 8, height: 8,
        zIndex: 10,
        visible: true,
        properties: {
          showCaption: true,
          captionText: 'Scan for source',
        },
      },
      // Category badge — hidden
      {
        id: 'category',
        type: 'text',
        source: 'ai-generated',
        binding: 'category',
        x: 3.7, y: 72, width: 50, height: 5,
        zIndex: 10,
        visible: false,
        properties: {
          fontFamily: 'Inter Display',
          fontWeight: 'bold',
          fontSize: 2.8,
          color: '#eab308',
          textAlign: 'left',
        },
      },
      // Headline — keyword-white highlighting, auto-fit
      {
        id: 'headline',
        type: 'text',
        source: 'ai-generated',
        binding: 'image_headline',
        x: 3.7, y: 68, width: 92.6, height: 28,
        zIndex: 10,
        visible: true,
        properties: {
          fontFamily: 'Inter Display',
          fontWeight: 'bold',
          fontSize: 10,
          color: '#ffffff',
          textAlign: 'left',
          lineHeight: 1.35,
          autoFit: true,
          highlightKeywords: true,
          highlightColor: 'rgba(255, 255, 255, 0.92)',
          highlightTextColor: '#1a1a1a',
        },
      },
    ],
  }
}

// ── News Overlay template ──
export function createNewsOverlayTemplate(): ImageTemplate {
  return {
    name: 'News Overlay',
    squareWidth: SQUARE.width,
    squareHeight: SQUARE.height,
    landscapeWidth: LANDSCAPE.width,
    landscapeHeight: LANDSCAPE.height,
    verticalWidth: VERTICAL.width,
    verticalHeight: VERTICAL.height,
    elements: [
      // Full-bleed AI background
      {
        id: 'background',
        type: 'image',
        source: 'ai-generated',
        binding: 'background_image',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        visible: true,
        properties: {},
      },
      // Heavy dark gradient — bottom 55%
      {
        id: 'gradient',
        type: 'gradient',
        source: 'static',
        x: 0, y: 45, width: 100, height: 55,
        zIndex: 1,
        visible: true,
        properties: {
          direction: 'vertical',
          adaptToBackground: false,
          gradientStops: [
            { offset: 0, color: 'rgba(0,0,0,0)' },
            { offset: 0.3, color: 'rgba(0,0,0,0.4)' },
            { offset: 1, color: 'rgba(0,0,0,0.88)' },
          ],
        },
      },
      // Logo — top-left, white on dark
      {
        id: 'logo',
        type: 'image',
        source: 'agent-branding',
        binding: 'logo',
        x: 2.5, y: 2, width: 10, height: 10,
        zIndex: 10,
        visible: true,
        properties: { adaptToBrightness: true },
      },
      // Headline — large bold white, red keyword highlights (no background)
      {
        id: 'headline',
        type: 'text',
        source: 'ai-generated',
        binding: 'image_headline',
        x: 3.5, y: 58, width: 93, height: 38,
        zIndex: 10,
        visible: true,
        properties: {
          fontFamily: 'Raleway',
          fontWeight: 'bold',
          fontSize: 8,
          color: '#ffffff',
          textAlign: 'left',
          lineHeight: 1.25,
          autoFit: true,
          highlightKeywords: true,
          highlightColor: 'transparent',
          highlightTextColor: '#d42027',
        },
      },
      // QR code (hidden by default in this style)
      {
        id: 'qr-code',
        type: 'qr-code',
        source: 'post-derived',
        binding: 'qr_url',
        x: 90, y: 2.5, width: 7, height: 7,
        zIndex: 10,
        visible: false,
        properties: { showCaption: false },
      },
    ],
  }
}

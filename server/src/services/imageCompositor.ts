import { createCanvas, loadImage, type CanvasRenderingContext2D } from 'canvas'
import QRCode from 'qrcode'
import type { ImageTemplate, TemplateElement } from './templateTypes.js'

const HEADLINE_FONT = 'sans-serif'

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'with', 'from', 'by', 'as', 'its', 'it', 'this', 'that', 'not', 'no',
  'up', 'out', 'if', 'about', 'into', 'over', 'after', 'amid', 'amidst',
  'than', 'too', 'very', 'can', 'just', 'so', 'now', 'new', 'says', 'said',
])

function measureBrightness(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): number {
  const ix = Math.max(0, Math.round(x))
  const iy = Math.max(0, Math.round(y))
  const iw = Math.min(Math.round(w), ctx.canvas.width - ix)
  const ih = Math.min(Math.round(h), ctx.canvas.height - iy)
  if (iw <= 0 || ih <= 0) return 128

  const imageData = ctx.getImageData(ix, iy, iw, ih)
  const data = imageData.data
  let total = 0
  const pixelCount = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  return total / pixelCount
}

function pickKeywords(headline: string, count = 2): Set<string> {
  const words = headline.split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9'-]/g, ''))
  const candidates = words.filter(w => w.length >= 4 && !STOP_WORDS.has(w.toLowerCase()))
  candidates.sort((a, b) => b.length - a.length)
  return new Set(candidates.slice(0, count).map(w => w.toLowerCase()))
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  maxFontSize: number,
  minFontSize: number,
): { fontSize: number; lines: string[] } {
  for (let size = maxFontSize; size >= minFontSize; size -= 2) {
    ctx.font = `bold ${size}px ${HEADLINE_FONT}`
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)

    if (lines.length <= maxLines) return { fontSize: size, lines }
  }

  // Fallback: use min size and truncate
  ctx.font = `bold ${minFontSize}px ${HEADLINE_FONT}`
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      if (lines.length >= maxLines) break
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine && lines.length < maxLines) lines.push(currentLine)
  return { fontSize: minFontSize, lines }
}

function drawHighlightedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  fontSize: number,
  keywords: Set<string>,
  textColor: string,
  shadowColor: string,
  highlightBg: string,
  highlightFg: string,
) {
  const words = line.split(' ')
  let curX = x
  const spaceWidth = ctx.measureText(' ').width

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const wordClean = word.replace(/[^a-zA-Z0-9'-]/g, '').toLowerCase()
    const isHighlighted = keywords.has(wordClean)

    ctx.font = `bold ${fontSize}px ${HEADLINE_FONT}`
    const wordMetrics = ctx.measureText(word)

    if (isHighlighted) {
      if (highlightBg !== 'transparent') {
        const padH = fontSize * 0.12
        const padV = fontSize * 0.1
        const consistentAscent = fontSize * 0.8
        const consistentDescent = fontSize * 0.2
        const consistentHeight = consistentAscent + consistentDescent

        const bgX = curX - padH
        const bgY = y - consistentAscent - padV
        const bgW = wordMetrics.width + padH * 2
        const bgH = consistentHeight + padV * 2

        const radius = fontSize * 0.08
        ctx.fillStyle = highlightBg
        ctx.beginPath()
        ctx.moveTo(bgX + radius, bgY)
        ctx.lineTo(bgX + bgW - radius, bgY)
        ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + radius)
        ctx.lineTo(bgX + bgW, bgY + bgH - radius)
        ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - radius, bgY + bgH)
        ctx.lineTo(bgX + radius, bgY + bgH)
        ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - radius)
        ctx.lineTo(bgX, bgY + radius)
        ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY)
        ctx.closePath()
        ctx.fill()
      }

      ctx.fillStyle = highlightFg
      ctx.fillText(word, curX, y)
    } else {
      ctx.fillStyle = shadowColor
      ctx.fillText(word, curX + 2, y + 2)
      ctx.fillStyle = textColor
      ctx.fillText(word, curX, y)
    }

    curX += wordMetrics.width
    if (i < words.length - 1) curX += spaceWidth
  }
}

async function generateQrBuffer(url: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: size,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

// ---------------------------------------------------------------------------
// Template element renderers
// ---------------------------------------------------------------------------

async function renderImageElement(
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  px: number, py: number, pw: number, ph: number,
  data: CompositeData,
): Promise<void> {
  if (el.binding === 'background_image' && data.backgroundBuffer) {
    const img = await loadImage(data.backgroundBuffer)
    ctx.drawImage(img, px, py, pw, ph)
  }
}

function renderGradientElement(
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  px: number, py: number, pw: number, ph: number,
): void {
  let stops = el.properties.gradientStops || [
    { offset: 0, color: 'rgba(0,0,0,0)' },
    { offset: 1, color: 'rgba(0,0,0,0.85)' },
  ]

  if (el.properties.adaptToBackground) {
    const brightness = measureBrightness(ctx, px, py, pw, ph)
    if (brightness > 170) {
      stops = [
        { offset: 0, color: 'rgba(255,255,255,0)' },
        { offset: 0.4, color: 'rgba(255,255,255,0.5)' },
        { offset: 1, color: 'rgba(255,255,255,0.88)' },
      ]
    } else {
      stops = [
        { offset: 0, color: 'rgba(0,0,0,0)' },
        { offset: 0.4, color: 'rgba(0,0,0,0.5)' },
        { offset: 1, color: 'rgba(0,0,0,0.85)' },
      ]
    }
  }

  const direction = el.properties.direction || 'vertical'
  const gradient = direction === 'horizontal'
    ? ctx.createLinearGradient(px, py, px + pw, py)
    : ctx.createLinearGradient(px, py, px, py + ph)

  for (const stop of stops) gradient.addColorStop(stop.offset, stop.color)
  ctx.fillStyle = gradient
  ctx.fillRect(px, py, pw, ph)
}

function renderTextElement(
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  px: number, py: number, pw: number, ph: number,
  data: CompositeData,
  canvasWidth: number, canvasHeight: number,
): void {
  let text = ''
  if (el.binding === 'image_headline') text = data.headline
  else if (el.binding === 'category') text = data.category?.toUpperCase() ?? ''
  else if (el.source === 'static') text = el.properties.text ?? ''
  else text = el.binding ?? ''

  if (!text) return

  const fontFamily = el.properties.fontFamily || HEADLINE_FONT
  const fontWeight = el.properties.fontWeight || 'bold'
  const fontSizePct = el.properties.fontSize || 5
  const actualFontSize = Math.round(fontSizePct / 100 * canvasHeight)
  const lineHeightMul = el.properties.lineHeight || 1.35

  let textColor = el.properties.color || '#ffffff'
  let shadowColor = 'rgba(0,0,0,0.6)'

  // Adapt to brightness
  const brightness = measureBrightness(ctx, px, py, Math.min(pw, canvasWidth - px), Math.min(ph, canvasHeight - py))
  if (brightness > 170 && (!el.properties.color || el.properties.color === '#ffffff')) {
    textColor = '#1a1a1a'
    shadowColor = 'rgba(255,255,255,0.4)'
  }

  ctx.font = `${fontWeight} ${actualFontSize}px "${fontFamily}"`
  ctx.textAlign = (el.properties.textAlign as CanvasTextAlign) || 'left'
  ctx.textBaseline = 'alphabetic'

  // Category badge with fill
  if (el.properties.fill) {
    const catMetrics = ctx.measureText(text)
    const catPadH = actualFontSize * 0.6
    const catPadV = actualFontSize * 0.35
    const catH = actualFontSize + catPadV * 2
    const catW = catMetrics.width + catPadH * 2
    const catRadius = el.properties.borderRadius || 4

    ctx.fillStyle = el.properties.fill
    ctx.beginPath()
    ctx.moveTo(px + catRadius, py)
    ctx.lineTo(px + catW - catRadius, py)
    ctx.quadraticCurveTo(px + catW, py, px + catW, py + catRadius)
    ctx.lineTo(px + catW, py + catH - catRadius)
    ctx.quadraticCurveTo(px + catW, py + catH, px + catW - catRadius, py + catH)
    ctx.lineTo(px + catRadius, py + catH)
    ctx.quadraticCurveTo(px, py + catH, px, py + catH - catRadius)
    ctx.lineTo(px, py + catRadius)
    ctx.quadraticCurveTo(px, py, px + catRadius, py)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = el.properties.color || '#1a1a1a'
    ctx.fillText(text, px + catPadH, py + catPadV + actualFontSize * 0.85)
    return
  }

  // Auto-fit text with optional keyword highlighting
  if (el.properties.autoFit) {
    const maxFontSize = actualFontSize
    const minFontSize = Math.round(actualFontSize * 0.55)
    const maxLines = Math.max(2, Math.floor(ph / (minFontSize * lineHeightMul)))
    const { fontSize, lines } = fitText(ctx, text, pw, maxLines, maxFontSize, minFontSize)
    const lineHeight = fontSize * lineHeightMul

    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`
    ctx.textAlign = (el.properties.textAlign as CanvasTextAlign) || 'left'

    if (el.properties.highlightKeywords) {
      const keywords = pickKeywords(text, 2)
      const hlBg = el.properties.highlightColor || 'rgba(234,179,8,0.9)'
      const hlFg = el.properties.highlightTextColor || '#1a1a1a'
      for (let i = 0; i < lines.length; i++) {
        const ly = py + i * lineHeight + fontSize * 0.8
        drawHighlightedLine(ctx, lines[i], px, ly, fontSize, keywords, textColor, shadowColor, hlBg, hlFg)
      }
    } else {
      ctx.fillStyle = textColor
      for (let i = 0; i < lines.length; i++) {
        const ly = py + i * lineHeight + fontSize * 0.8
        ctx.fillText(lines[i], px, ly)
      }
    }
  } else {
    ctx.fillStyle = textColor
    ctx.fillText(text, px, py + actualFontSize * 0.8)
  }
}

async function renderQrElement(
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  px: number, py: number, pw: number, _ph: number,
  data: CompositeData,
): Promise<void> {
  if (!data.qrUrl) return

  const qrSize = pw
  const qrBuffer = await generateQrBuffer(data.qrUrl, qrSize)
  const qrImage = await loadImage(qrBuffer)

  const qrBgPad = 6
  const qrRadius = 8
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  const bx = px - qrBgPad
  const by = py - qrBgPad
  const bw = qrSize + qrBgPad * 2
  const bh = qrSize + qrBgPad * 2
  ctx.moveTo(bx + qrRadius, by)
  ctx.lineTo(bx + bw - qrRadius, by)
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + qrRadius)
  ctx.lineTo(bx + bw, by + bh - qrRadius)
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - qrRadius, by + bh)
  ctx.lineTo(bx + qrRadius, by + bh)
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - qrRadius)
  ctx.lineTo(bx, by + qrRadius)
  ctx.quadraticCurveTo(bx, by, bx + qrRadius, by)
  ctx.closePath()
  ctx.fill()

  ctx.drawImage(qrImage, px, py, qrSize, qrSize)

  if (el.properties.showCaption) {
    const captionText = el.properties.captionText || 'Scan for source'
    const captionSize = Math.round(qrSize * 0.14)
    ctx.font = `bold ${captionSize}px ${HEADLINE_FONT}`
    const brightness = measureBrightness(ctx, px, py, qrSize, qrSize)
    ctx.fillStyle = brightness < 128 ? '#ffffff' : '#1a1a1a'
    ctx.textAlign = 'center'
    ctx.fillText(captionText, px + qrSize / 2, py + qrSize + qrBgPad + captionSize + 4)
    ctx.textAlign = 'left'
  }
}

function renderShapeElement(
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  px: number, py: number, pw: number, ph: number,
): void {
  const prevAlpha = ctx.globalAlpha
  if (el.properties.opacity !== undefined) ctx.globalAlpha = el.properties.opacity
  const radius = el.properties.borderRadius || 0

  if (el.properties.fill) {
    ctx.fillStyle = el.properties.fill
    if (radius > 0) {
      ctx.beginPath()
      ctx.moveTo(px + radius, py)
      ctx.lineTo(px + pw - radius, py)
      ctx.quadraticCurveTo(px + pw, py, px + pw, py + radius)
      ctx.lineTo(px + pw, py + ph - radius)
      ctx.quadraticCurveTo(px + pw, py + ph, px + pw - radius, py + ph)
      ctx.lineTo(px + radius, py + ph)
      ctx.quadraticCurveTo(px, py + ph, px, py + ph - radius)
      ctx.lineTo(px, py + radius)
      ctx.quadraticCurveTo(px, py, px + radius, py)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.fillRect(px, py, pw, ph)
    }
  }

  ctx.globalAlpha = prevAlpha
}

// ---------------------------------------------------------------------------
// Main composite function
// ---------------------------------------------------------------------------

interface CompositeData {
  backgroundBuffer: Buffer | null
  headline: string
  category: string | null
  slug: string
  qrUrl: string | null
}

export async function compositeFromTemplate(
  template: ImageTemplate,
  format: 'square' | 'landscape' | 'vertical',
  data: CompositeData,
): Promise<Buffer> {
  const width = format === 'vertical' ? template.verticalWidth : format === 'square' ? template.squareWidth : template.landscapeWidth
  const height = format === 'vertical' ? template.verticalHeight : format === 'square' ? template.squareHeight : template.landscapeHeight

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const elements = [...template.elements]
    .filter(el => el.visible)
    .sort((a, b) => a.zIndex - b.zIndex)

  for (const el of elements) {
    const px = Math.round(el.x / 100 * width)
    const py = Math.round(el.y / 100 * height)
    const pw = Math.round(el.width / 100 * width)
    const ph = Math.round(el.height / 100 * height)

    switch (el.type) {
      case 'image':
        await renderImageElement(ctx, el, px, py, pw, ph, data)
        break
      case 'gradient':
        renderGradientElement(ctx, el, px, py, pw, ph)
        break
      case 'text':
        renderTextElement(ctx, el, px, py, pw, ph, data, width, height)
        break
      case 'qr-code':
        await renderQrElement(ctx, el, px, py, pw, ph, data)
        break
      case 'shape':
        renderShapeElement(ctx, el, px, py, pw, ph)
        break
    }
  }

  return canvas.toBuffer('image/png')
}

// Convenience: composite all sizes and return buffers
export async function compositeAllFormats(
  template: ImageTemplate,
  squareBg: Buffer | null,
  landscapeBg: Buffer | null,
  headline: string,
  category?: string | null,
  qrUrl?: string | null,
  verticalBg?: Buffer | null,
): Promise<{ square: Buffer | null; landscape: Buffer | null; vertical: Buffer | null }> {
  const data = {
    headline,
    category: category ?? null,
    slug: '',
    qrUrl: qrUrl ?? null,
  }

  let square: Buffer | null = null
  let landscape: Buffer | null = null
  let vertical: Buffer | null = null

  if (squareBg) {
    square = await compositeFromTemplate(template, 'square', { ...data, backgroundBuffer: squareBg })
  }
  if (landscapeBg) {
    landscape = await compositeFromTemplate(template, 'landscape', { ...data, backgroundBuffer: landscapeBg })
  }
  if (verticalBg) {
    vertical = await compositeFromTemplate(template, 'vertical', { ...data, backgroundBuffer: verticalBg })
  }

  return { square, landscape, vertical }
}

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react'
import type { ImageTemplate, TemplateElement } from './templateTypes'
import { SQUARE, LANDSCAPE, VERTICAL } from './templateTypes'

// Fabric.js v7 imports
import { Canvas, Rect, Textbox, Gradient, FabricText } from 'fabric'
import type { FabricObject } from 'fabric'

const MAX_EDITOR_WIDTH = 600

export interface TemplateCanvasHandle {
  addElement: (element: TemplateElement) => void
  removeElement: (elementId: string) => void
  updateElement: (element: TemplateElement) => void
  selectElement: (elementId: string) => void
  serialize: () => TemplateElement[]
  resetElements: (elements: TemplateElement[]) => void
}

interface TemplateCanvasProps {
  template: ImageTemplate
  format: 'square' | 'landscape' | 'vertical'
  onSelectElement: (elementId: string | null) => void
  onElementUpdate: (element: TemplateElement) => void
}

// Helper: get canvas pixel dimensions for a format
function getCanvasDims(format: 'square' | 'landscape' | 'vertical') {
  if (format === 'vertical') return VERTICAL
  return format === 'square' ? SQUARE : LANDSCAPE
}

// Helper: percentage to pixels
function pctToPx(pct: number, total: number): number {
  return (pct / 100) * total
}

// Helper: pixels to percentage
function pxToPct(px: number, total: number): number {
  return (px / total) * 100
}

// Get custom data stored on a Fabric object
function getElementData(obj: FabricObject): {
  elementId?: string
  elementType?: string
  elementSource?: string
  elementBinding?: string
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (obj as any).data ?? {}
}

// Create a Fabric object from a TemplateElement
// NOTE: All rects use originX/originY: 'center' to work around a Fabric.js v7 bug
// where the fill only renders to half the width when using originX: 'left'.
function createFabricObject(
  element: TemplateElement,
  canvasW: number,
  canvasH: number
): FabricObject {
  const left = pctToPx(element.x, canvasW)
  const top = pctToPx(element.y, canvasH)
  const width = pctToPx(element.width, canvasW)
  const height = pctToPx(element.height, canvasH)
  const angle = element.rotation ?? 0
  const visible = element.visible

  // Center coords for origin:'center' mode
  const cx = left + width / 2
  const cy = top + height / 2

  const customData = {
    elementId: element.id,
    elementType: element.type,
    elementSource: element.source,
    elementBinding: element.binding,
  }

  let fabricObj: FabricObject

  switch (element.type) {
    case 'image': {
      if (element.source === 'ai-generated') {
        fabricObj = new Rect({
          left: cx, top: cy, originX: 'center', originY: 'center',
          width, height,
          fill: 'rgba(60, 60, 80, 0.5)',
          stroke: '#888',
          strokeDashArray: [8, 4],
          strokeWidth: 1,
          angle, visible,
        })
      } else {
        fabricObj = new Rect({
          left: cx, top: cy, originX: 'center', originY: 'center',
          width, height,
          fill: 'rgba(200, 210, 230, 0.3)',
          stroke: '#88aacc',
          strokeWidth: 1.5,
          angle, visible,
        })
      }
      break
    }

    case 'gradient': {
      const direction = element.properties.direction ?? 'vertical'
      const stops = element.properties.gradientStops ?? [
        { offset: 0, color: 'rgba(0,0,0,0)' },
        { offset: 1, color: 'rgba(0,0,0,0.85)' },
      ]

      // Use pixel-based gradient coordinates relative to the object
      // For Fabric.js, pixel coords are relative to the object center
      const halfW = width / 2
      const halfH = height / 2
      const gradientCoords =
        direction === 'vertical'
          ? { x1: 0, y1: -halfH, x2: 0, y2: halfH }
          : { x1: -halfW, y1: 0, x2: halfW, y2: 0 }

      const gradientFill = new Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: gradientCoords,
        colorStops: stops.map((s) => ({
          offset: s.offset,
          color: s.color,
        })),
      })

      fabricObj = new Rect({
        left: cx, top: cy, originX: 'center', originY: 'center',
        width, height,
        fill: gradientFill,
        angle, visible,
        opacity: element.properties.opacity ?? 1,
      })
      break
    }

    case 'text': {
      const isAI = element.source === 'ai-generated'
      const displayText = isAI
        ? `[AI: ${element.binding ?? 'text'}]`
        : element.properties.text ?? 'Static text'

      const fontSize = element.properties.fontSize
        ? pctToPx(element.properties.fontSize, canvasH)
        : 16

      // Fabric.js v7 defaults originX/Y to 'center', so use left/top origin explicitly
      // for text elements since text alignment works better with left/top origin.
      fabricObj = new Textbox(displayText, {
        left,
        top,
        width,
        originX: 'left',
        originY: 'top',
        fontSize,
        fontFamily: element.properties.fontFamily ?? 'sans-serif',
        fontWeight: (element.properties.fontWeight as string) ?? 'normal',
        fill: element.properties.color ?? '#ffffff',
        textAlign: (element.properties.textAlign ?? 'left') as 'left' | 'center' | 'right',
        fontStyle: isAI ? 'italic' : 'normal',
        lineHeight: element.properties.lineHeight ?? 1.3,
        angle,
        visible,
      })
      break
    }

    case 'shape': {
      const rx = element.properties.borderRadius ?? 0
      fabricObj = new Rect({
        left: cx, top: cy, originX: 'center', originY: 'center',
        width, height,
        fill: element.properties.fill ?? '#cccccc',
        stroke: element.properties.stroke ?? 'transparent',
        strokeWidth: element.properties.strokeWidth ?? 0,
        rx, ry: rx,
        angle, visible,
        opacity: element.properties.opacity ?? 1,
      })
      break
    }

    case 'qr-code': {
      fabricObj = new Rect({
        left: cx, top: cy, originX: 'center', originY: 'center',
        width, height,
        fill: '#ffffff',
        stroke: '#999',
        strokeDashArray: [4, 3],
        strokeWidth: 1,
        angle, visible,
      })
      break
    }

    default:
      fabricObj = new Rect({
        left: cx, top: cy, originX: 'center', originY: 'center',
        width, height,
        fill: '#ddd',
        angle, visible,
      })
  }

  // Store custom data on the Fabric object
  fabricObj.set('data' as keyof typeof fabricObj, customData)

  return fabricObj
}

// Create overlay label for elements that need them (added separately so they don't interfere with selection)
function createLabel(
  element: TemplateElement,
  canvasW: number,
  canvasH: number
): FabricObject | null {
  const left = pctToPx(element.x, canvasW)
  const top = pctToPx(element.y, canvasH)
  const width = pctToPx(element.width, canvasW)
  const height = pctToPx(element.height, canvasH)

  let labelText = ''
  let fontSize = 14
  let color = '#888'

  switch (element.type) {
    case 'image':
      if (element.source === 'ai-generated') {
        labelText = `[AI: ${element.binding ?? 'image'}]`
        color = '#aaa'
      } else {
        labelText = '[Logo]'
        color = '#88aacc'
      }
      break
    case 'qr-code':
      labelText = 'QR'
      fontSize = Math.min(width, height) * 0.35
      color = '#333'
      break
    default:
      return null
  }

  if (!labelText) return null

  const label = new FabricText(labelText, {
    left: left + width / 2,
    top: top + height / 2,
    fontSize,
    fill: color,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    visible: element.visible,
  })

  label.set('data' as keyof typeof label, { isLabel: true, forElement: element.id })

  return label
}

// Convert a Fabric object back to a TemplateElement update
// Objects use originX/originY: 'center', so left/top is the center point.
// For Textbox objects, originX/originY is 'left'/'top' (default), so no adjustment needed.
function fabricObjToElementUpdate(
  obj: FabricObject,
  canvasW: number,
  canvasH: number,
  existingElement: TemplateElement
): TemplateElement {
  const scaleX = (obj as { scaleX?: number }).scaleX ?? 1
  const scaleY = (obj as { scaleY?: number }).scaleY ?? 1
  const w = (obj.width ?? 0) * scaleX
  const h = (obj.height ?? 0) * scaleY

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isCentered = (obj as any).originX === 'center'
  const objLeft = (obj.left ?? 0) - (isCentered ? w / 2 : 0)
  const objTop = (obj.top ?? 0) - (isCentered ? h / 2 : 0)

  return {
    ...existingElement,
    x: pxToPct(objLeft, canvasW),
    y: pxToPct(objTop, canvasH),
    width: pxToPct(w, canvasW),
    height: pxToPct(h, canvasH),
    rotation: obj.angle ?? 0,
  }
}

function addElementsToCanvas(
  canvas: Canvas,
  elements: TemplateElement[],
  canvasW: number,
  canvasH: number,
) {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  for (const element of sorted) {
    const obj = createFabricObject(element, canvasW, canvasH)
    canvas.add(obj)
    // Add label overlays for image/qr elements
    const label = createLabel(element, canvasW, canvasH)
    if (label) canvas.add(label)
  }
}

const TemplateCanvas = forwardRef<TemplateCanvasHandle, TemplateCanvasProps>(
  function TemplateCanvas({ template, format, onSelectElement, onElementUpdate }, ref) {
    const canvasElRef = useRef<HTMLCanvasElement>(null)
    const fabricCanvasRef = useRef<Canvas | null>(null)
    // Keep a mapping of elementId -> TemplateElement for serialize/update
    const elementsMapRef = useRef<Map<string, TemplateElement>>(new Map())

    const dims = getCanvasDims(format)
    // Use the actual output dimensions (1080x1080 or 1200x627) for the Fabric canvas
    // so objects are positioned in real pixel space. CSS transform scales it down to fit.
    const canvasW = dims.width
    const canvasH = dims.height
    const cssScale = MAX_EDITOR_WIDTH / canvasW
    const displayW = Math.round(canvasW * cssScale)
    const displayH = Math.round(canvasH * cssScale)

    // Find an object on the canvas by elementId
    const findObjectById = useCallback(
      (elementId: string): FabricObject | undefined => {
        const canvas = fabricCanvasRef.current
        if (!canvas) return undefined
        return canvas.getObjects().find((obj) => {
          const data = getElementData(obj)
          return data.elementId === elementId
        })
      },
      []
    )

    // Initialize the canvas on mount
    useEffect(() => {
      const el = canvasElRef.current
      if (!el) return

      // Create canvas at full output resolution, disable retina scaling
      // (we handle display scaling via CSS transform on the wrapper)
      const canvas = new Canvas(el, {
        width: canvasW,
        height: canvasH,
        backgroundColor: '#2a2a35',
        selection: true,
        enableRetinaScaling: false,
      })

      fabricCanvasRef.current = canvas

      // Fabric.js creates a canvas-container wrapper at the full canvas resolution.
      // We apply a CSS transform on that wrapper to scale it down to display size.
      // The outer div constrains the visible area so it doesn't overflow.
      const wrapper = el.parentElement
      if (wrapper?.classList.contains('canvas-container')) {
        wrapper.style.transformOrigin = 'top left'
        wrapper.style.transform = `scale(${cssScale})`
      }

      // Add all template elements (pre-scale coordinates by using display dimensions)
      const map = new Map<string, TemplateElement>()
      for (const element of template.elements) {
        map.set(element.id, element)
      }
      elementsMapRef.current = map

      addElementsToCanvas(canvas, template.elements, canvasW, canvasH)
      canvas.requestRenderAll()

      // Selection events
      canvas.on('selection:created', (e) => {
        const selected = e.selected?.[0]
        if (selected) {
          const data = getElementData(selected)
          onSelectElement(data.elementId ?? null)
        }
      })

      canvas.on('selection:updated', (e) => {
        const selected = e.selected?.[0]
        if (selected) {
          const data = getElementData(selected)
          onSelectElement(data.elementId ?? null)
        }
      })

      canvas.on('selection:cleared', () => {
        onSelectElement(null)
      })

      // Object modified event — convert back to percentage using display dims
      canvas.on('object:modified', (e) => {
        const obj = e.target
        if (!obj) return
        const data = getElementData(obj)
        if (!data.elementId) return
        const existing = elementsMapRef.current.get(data.elementId)
        if (!existing) return
        const updated = fabricObjToElementUpdate(obj, canvasW, canvasH, existing)
        elementsMapRef.current.set(data.elementId, updated)
        onElementUpdate(updated)
      })

      return () => {
        canvas.dispose()
        fabricCanvasRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Mount once

    // Handle format changes (re-layout all elements)
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return

      const newDims = getCanvasDims(format)
      const newCanvasW = newDims.width
      const newCanvasH = newDims.height
      const newCssScale = MAX_EDITOR_WIDTH / newCanvasW

      // Clear and re-add all objects with new dimensions
      canvas.clear()
      canvas.backgroundColor = '#2a2a35'

      // Resize canvas to new output dimensions
      canvas.setDimensions({ width: newCanvasW, height: newCanvasH })

      // Update CSS transform on wrapper (Fabric sets wrapper to canvas size automatically)
      const wrapper = canvas.getElement().parentElement
      if (wrapper?.classList.contains('canvas-container')) {
        wrapper.style.transform = `scale(${newCssScale})`
      }

      // Re-add elements with new dimensions
      addElementsToCanvas(
        canvas,
        [...elementsMapRef.current.values()],
        newCanvasW,
        newCanvasH,
      )
      canvas.requestRenderAll()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [format])

    // Expose imperative methods
    useImperativeHandle(
      ref,
      () => ({
        addElement(element: TemplateElement) {
          const canvas = fabricCanvasRef.current
          if (!canvas) return
          const obj = createFabricObject(element, canvasW, canvasH)
          canvas.add(obj)
          const label = createLabel(element, canvasW, canvasH)
          if (label) canvas.add(label)
          elementsMapRef.current.set(element.id, element)
          canvas.requestRenderAll()
        },

        removeElement(elementId: string) {
          const canvas = fabricCanvasRef.current
          if (!canvas) return
          // Remove the element and any associated labels
          const toRemove = canvas.getObjects().filter((obj) => {
            const data = getElementData(obj)
            return data.elementId === elementId ||
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (obj as any).data?.forElement === elementId
          })
          for (const obj of toRemove) {
            canvas.remove(obj)
          }
          elementsMapRef.current.delete(elementId)
          canvas.requestRenderAll()
        },

        updateElement(element: TemplateElement) {
          const canvas = fabricCanvasRef.current
          if (!canvas) return
          // Remove old objects (element + labels)
          const toRemove = canvas.getObjects().filter((obj) => {
            const data = getElementData(obj)
            return data.elementId === element.id ||
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (obj as any).data?.forElement === element.id
          })
          for (const obj of toRemove) {
            canvas.remove(obj)
          }
          // Add new
          const newObj = createFabricObject(element, canvasW, canvasH)
          canvas.add(newObj)
          const label = createLabel(element, canvasW, canvasH)
          if (label) canvas.add(label)
          elementsMapRef.current.set(element.id, element)
          canvas.requestRenderAll()
        },

        selectElement(elementId: string) {
          const canvas = fabricCanvasRef.current
          if (!canvas) return
          const obj = findObjectById(elementId)
          if (obj) {
            canvas.setActiveObject(obj)
            canvas.requestRenderAll()
          }
        },

        serialize(): TemplateElement[] {
          return [...elementsMapRef.current.values()]
        },

        resetElements(elements: TemplateElement[]) {
          const canvas = fabricCanvasRef.current
          if (!canvas) return
          canvas.clear()
          canvas.backgroundColor = '#2a2a35'
          elementsMapRef.current.clear()
          for (const el of elements) {
            elementsMapRef.current.set(el.id, el)
          }
          addElementsToCanvas(canvas, elements, canvasW, canvasH)
          canvas.requestRenderAll()
        },
      }),
      [canvasW, canvasH, findObjectById]
    )

    return (
      <div style={{ width: displayW, height: displayH, overflow: 'hidden' }}>
        <canvas
          ref={canvasElRef}
        />
      </div>
    )
  }
)

TemplateCanvas.displayName = 'TemplateCanvas'

export default TemplateCanvas

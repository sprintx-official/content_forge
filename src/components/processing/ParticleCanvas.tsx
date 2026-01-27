import { useEffect, useRef } from 'react'
import { useParticles } from '@/hooks/useParticles'

export function ParticleCanvas() {
  const { canvasRef, startAnimation, stopAnimation, reinitParticles } =
    useParticles()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }

      // Use logical dimensions for particles
      canvas.width = rect.width
      canvas.height = rect.height

      reinitParticles()
    }

    const observer = new ResizeObserver(() => {
      resizeCanvas()
    })
    observer.observe(container)

    resizeCanvas()
    startAnimation()

    return () => {
      observer.disconnect()
      stopAnimation()
    }
  }, [canvasRef, startAnimation, stopAnimation, reinitParticles])

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-70"
      />
    </div>
  )
}

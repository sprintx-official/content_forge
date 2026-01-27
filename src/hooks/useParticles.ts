import { useRef, useCallback, useEffect } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
}

interface UseParticlesOptions {
  reducedMotion?: boolean
}

export function useParticles({ reducedMotion = false }: UseParticlesOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>(0)
  const isRunningRef = useRef(false)
  const drawFrameRef = useRef<() => void>(() => {})

  const PARTICLE_COUNT = reducedMotion ? 20 : 100
  const SPEED_FACTOR = reducedMotion ? 0.15 : 0.4
  const CONNECTION_DISTANCE = 100

  const createParticles = useCallback(
    (width: number, height: number): Particle[] => {
      const particles: Particle[] = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * SPEED_FACTOR,
          vy: (Math.random() - 0.5) * SPEED_FACTOR,
          radius: 1 + Math.random() * 2,
          opacity: 0.1 + Math.random() * 0.5,
          color: Math.random() > 0.5 ? '#00f0ff' : '#a855f7',
        })
      }
      return particles
    },
    [PARTICLE_COUNT, SPEED_FACTOR],
  )

  // Keep drawFrameRef updated with latest closure
  useEffect(() => {
    drawFrameRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height } = canvas

      ctx.clearRect(0, 0, width, height)

      const particles = particlesRef.current

      // Update positions and wrap around edges
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < CONNECTION_DISTANCE) {
            const connectionOpacity =
              (1 - distance / CONNECTION_DISTANCE) * 0.15
            ctx.beginPath()
            ctx.strokeStyle = `rgba(0, 240, 255, ${connectionOpacity})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle =
          p.color === '#00f0ff'
            ? `rgba(0, 240, 255, ${p.opacity})`
            : `rgba(168, 85, 247, ${p.opacity})`
        ctx.fill()
      }

      if (isRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => drawFrameRef.current())
      }
    }
  }, [CONNECTION_DISTANCE])

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    isRunningRef.current = true

    if (particlesRef.current.length === 0) {
      particlesRef.current = createParticles(canvas.width, canvas.height)
    }

    animationFrameRef.current = requestAnimationFrame(() => drawFrameRef.current())
  }, [createParticles])

  const stopAnimation = useCallback(() => {
    isRunningRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = 0
    }
  }, [])

  // Handle visibility change - pause when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isRunningRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = 0
        }
      } else {
        if (isRunningRef.current) {
          animationFrameRef.current = requestAnimationFrame(() => drawFrameRef.current())
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Reinitialize particles when canvas size changes
  const reinitParticles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    particlesRef.current = createParticles(canvas.width, canvas.height)
  }, [createParticles])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    canvasRef,
    startAnimation,
    stopAnimation,
    reinitParticles,
  }
}

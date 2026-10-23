import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const COLORS = ['#e879f9', '#a21caf', '#d4af37', '#f5e6a8', '#ffffff', '#f0abfc', '#e8c547']

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
  life: number
  maxLife: number
  shape: 'rect' | 'circle' | 'star'
}

function spawnBurst(w: number, h: number, count: number): Particle[] {
  const cx = w * 0.5
  const cy = h * 0.42
  const out: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
    const speed = 2.2 + Math.random() * 4.5
    out.push({
      x: cx + (Math.random() - 0.5) * 8,
      y: cy + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      size: 3 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      life: 0,
      maxLife: 55 + Math.random() * 35,
      shape: ['rect', 'circle', 'star'][Math.floor(Math.random() * 3)] as Particle['shape'],
    })
  }
  return out
}

function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

export function CelebrationBurst({
  active,
  className,
}: {
  active: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    if (!active) {
      particlesRef.current = []
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    particlesRef.current = spawnBurst(rect.width, rect.height, 72)
    let frame = 0

    const tick = () => {
      frame++
      ctx.clearRect(0, 0, rect.width, rect.height)

      const gravity = 0.12
      const drag = 0.985
      const alive: Particle[] = []

      for (const p of particlesRef.current) {
        p.life++
        if (p.life > p.maxLife) continue
        p.vx *= drag
        p.vy = p.vy * drag + gravity
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr

        const alpha = 1 - p.life / p.maxLife
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = alpha * 0.95
        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'star') {
          drawStar(ctx, p.size * 0.5)
          ctx.fill()
        } else {
          ctx.fillRect(-p.size * 0.5, -p.size * 0.25, p.size, p.size * 0.5)
        }
        ctx.restore()
        alive.push(p)
      }

      particlesRef.current = alive
      if (frame < 90 || alive.length > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      particlesRef.current = []
    }
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      aria-hidden
    />
  )
}

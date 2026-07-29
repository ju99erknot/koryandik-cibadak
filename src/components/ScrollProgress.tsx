'use client'

import React, { useEffect, useRef } from 'react'

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number>(0)

  useEffect(() => {
    const handleScroll = () => {
      // Cancel any pending rAF to batch scroll events
      if (rafId.current) cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight - windowHeight
        const scrolled = window.scrollY
        const progress = documentHeight > 0 ? (scrolled / documentHeight) * 100 : 0
        // Direct DOM update — avoids React setState re-render on every scroll tick
        if (barRef.current) {
          barRef.current.style.width = `${progress}%`
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  return (
    <div className="scroll-progress-container">
      <div
        ref={barRef}
        className="scroll-progress-bar"
        style={{ width: '0%' }}
      />
    </div>
  )
}

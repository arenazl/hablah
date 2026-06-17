import { useEffect, useState } from 'react'

/** True cuando el viewport es de celular (< breakpoint). Para paneles con estilos
 *  inline que no pueden usar media queries: cambia grids de 2 columnas a 1, etc. */
export function useIsMobile(breakpoint = 760): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint,
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

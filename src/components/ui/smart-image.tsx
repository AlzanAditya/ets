import * as React from "react"
import {
  getAssetUrl,
  getCdnAssetUrl,
  markLocalAssetFailed,
  markCdnAssetFailed,
  isExternalOrDataUrl,
} from "@/lib/asset-fallback"

export interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  fallbackSrc?: string
}

/**
 * SmartImage component that prioritizes local static assets and seamlessly falls back to CDN
 * if the local asset is missing or fails to load.
 */
export const SmartImage = React.forwardRef<HTMLImageElement, SmartImageProps>(
  ({ src, fallbackSrc, onError, className, alt = "", ...props }, ref) => {
    const [currentSrc, setCurrentSrc] = React.useState<string>(() => {
      if (!src) return ""
      return getAssetUrl(src)
    })
    const [, setHasError] = React.useState(false)
    const triedCdnRef = React.useRef(false)

    React.useEffect(() => {
      if (!src) {
        setCurrentSrc("")
        return
      }
      triedCdnRef.current = false
      setHasError(false)
      setCurrentSrc(getAssetUrl(src))
    }, [src])

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!src || isExternalOrDataUrl(src)) {
        setHasError(true)
        if (fallbackSrc) setCurrentSrc(fallbackSrc)
        onError?.(e)
        return
      }

      // Step 1: Local failed -> Try CDN URL
      if (!triedCdnRef.current) {
        triedCdnRef.current = true
        markLocalAssetFailed(src)
        const cdnUrl = getCdnAssetUrl(src)
        if (currentSrc !== cdnUrl) {
          setCurrentSrc(cdnUrl)
          return
        }
      }

      // Step 2: CDN also failed -> Stop retry loop, apply optional fallbackSrc or trigger onError
      markCdnAssetFailed(src)
      setHasError(true)
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc)
      }
      onError?.(e)
    }

    if (!src && !fallbackSrc) {
      return null
    }

    return (
      <img
        ref={ref}
        src={currentSrc}
        alt={alt}
        onError={handleError}
        className={className}
        {...props}
      />
    )
  }
)

SmartImage.displayName = "SmartImage"

import * as React from "react"
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RootErrorBoundaryProps {
  children: React.ReactNode
}

interface RootErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Root-level safety net.
 *
 * The app previously had no ErrorBoundary anywhere. Any uncaught render-time
 * exception (e.g. a PDF/canvas edge case that slips past the try/catch
 * blocks in the Berita Acara pipeline) would unmount the entire React tree
 * with nothing rendered in its place, which looks like the page crashed or
 * refreshed. This component catches that instead and offers a manual retry
 * without a hard page reload, and only falls back to a real reload if the
 * error repeats.
 */
export class RootErrorBoundary extends React.Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  constructor(props: RootErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RootErrorBoundary] Uncaught render error:", error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
          <div className="flex max-w-md flex-col items-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/5">
              <AlertTriangleIcon className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
              Terjadi Kesalahan Tak Terduga
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {this.state.error?.message || "Aplikasi mengalami error saat menampilkan halaman ini."}
            </p>
            <Button
              onClick={this.handleRetry}
              variant="outline"
              className="mt-6 gap-2 border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <RefreshCwIcon className="h-4 w-4" />
              Coba Lagi
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

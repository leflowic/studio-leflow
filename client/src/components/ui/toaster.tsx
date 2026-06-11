import { CheckCircle2, XCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const DURATION = 5000

function ToastIcon({ variant }: { variant?: string }) {
  if (variant === "destructive") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive mt-[1px]">
        <XCircle className="h-[15px] w-[15px]" />
      </div>
    )
  }
  if (variant === "info") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary mt-[1px]">
        <Info className="h-[15px] w-[15px]" />
      </div>
    )
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-500 mt-[1px]">
      <CheckCircle2 className="h-[15px] w-[15px]" />
    </div>
  )
}

function ProgressBar({ variant }: { variant?: string }) {
  const trackColor =
    variant === "destructive"
      ? "bg-destructive/15"
      : variant === "info"
        ? "bg-primary/15"
        : "bg-emerald-500/15"

  const barColor =
    variant === "destructive"
      ? "bg-destructive/50"
      : variant === "info"
        ? "bg-primary/50"
        : "bg-emerald-500/50"

  return (
    <div className={cn("absolute bottom-0 left-0 h-[2px] w-full", trackColor)}>
      <div
        className={cn("h-full", barColor)}
        style={{
          animation: `toast-progress ${DURATION}ms linear forwards`,
        }}
      />
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={DURATION}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <ToastIcon variant={variant} />
            <div className="flex-1 grid gap-0 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
            <ProgressBar variant={variant} />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

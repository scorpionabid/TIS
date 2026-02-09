import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const loadingSpinnerVariants = cva(
  "animate-spin rounded-full border-2 border-transparent border-t-current",
  {
    variants: {
      size: {
        default: "h-8 w-8",
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-12 w-12",
        xl: "h-16 w-16"
      },
      variant: {
        default: "border-primary",
        muted: "border-muted-foreground",
        destructive: "border-destructive"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default"
    }
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingSpinnerVariants> {
  label?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, variant, size, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(loadingSpinnerVariants({ variant, size }), className)}
        role="status"
        aria-label={label || "Loading"}
        {...props}
      >
        <span className="sr-only">{label || "Loading..."}</span>
      </div>
    )
  }
)

LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner }

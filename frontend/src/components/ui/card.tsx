import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

type CardAlign = "start" | "center"

interface CardContextValue {
  align: CardAlign
}

const CardContext = React.createContext<CardContextValue>({
  align: "start",
})

const cardVariants = cva(
  "group/card relative w-full rounded-xl border border-border/70 bg-card/90 text-card-foreground shadow-none transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        minimal: "border-border/60 bg-card/90",
        elevated: "border-transparent bg-card shadow-card",
        surface: "border-border/50 bg-surface",
        outline: "border-border bg-transparent",
        muted: "border-border/40 bg-muted/40 text-muted-foreground",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-card hover:-translate-y-[2px]",
        false: "",
      },
      align: {
        start: "",
        center: "text-center",
      },
    },
    defaultVariants: {
      variant: "minimal",
      interactive: "false",
      align: "start",
    },
  }
)

type CardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants> & {
    interactive?: boolean
  }

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, align = "start", interactive = false, ...props },
    ref
  ) => {
    return (
      <CardContext.Provider value={{ align }}>
        <div
          ref={ref}
          data-card-align={align}
          className={cn(
            cardVariants({
              variant,
              align,
              interactive: interactive ? "true" : "false",
            }),
            interactive && "transition-transform",
            className
          )}
          {...props}
        />
      </CardContext.Provider>
    )
  }
)
Card.displayName = "Card"

const cardHeaderVariants = cva(
  "flex flex-col gap-1.5 px-4 py-4 sm:px-5 sm:py-5",
  {
    variants: {
      align: {
        start: "items-start text-left",
        center: "items-center text-center",
      },
      density: {
        default: "",
        cozy: "py-3 sm:py-4",
        compact: "py-2 sm:py-3",
      },
    },
    defaultVariants: {
      align: "start",
      density: "default",
    },
  }
)

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardHeaderVariants>

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, align, density, ...props }, ref) => {
    const context = React.useContext(CardContext)
    const resolvedAlign = align ?? context?.align ?? "start"

    return (
      <div
        ref={ref}
        className={cn(
          cardHeaderVariants({ align: resolvedAlign, density }),
          className
        )}
        {...props}
      />
    )
  }
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg sm:text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const cardContentVariants = cva("px-4 pb-4 sm:px-5 sm:pb-5", {
  variants: {
    align: {
      start: "text-left",
      center: "text-center",
    },
    density: {
      default: "",
      relaxed: "py-4 sm:py-5",
      cozy: "py-3 sm:py-4",
      compact: "py-2 sm:py-3",
      none: "p-0",
    },
  },
  defaultVariants: {
    align: "start",
    density: "default",
  },
})

type CardContentProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardContentVariants>

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, align, density, ...props }, ref) => {
    const context = React.useContext(CardContext)
    const resolvedAlign = align ?? context?.align ?? "start"
    return (
      <div
        ref={ref}
        className={cn(
          cardContentVariants({ align: resolvedAlign, density }),
          className
        )}
        {...props}
      />
    )
  }
)
CardContent.displayName = "CardContent"

const cardFooterVariants = cva(
  "flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pb-5",
  {
    variants: {
      align: {
        start: "text-left",
        center: "text-center sm:text-left sm:justify-center",
      },
      density: {
        default: "",
        cozy: "py-3 sm:py-4",
        compact: "py-2 sm:py-3",
      },
    },
    defaultVariants: {
      align: "start",
      density: "default",
    },
  }
)

type CardFooterProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardFooterVariants>

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align, density, ...props }, ref) => {
    const context = React.useContext(CardContext)
    const resolvedAlign = align ?? context?.align ?? "start"

    return (
      <div
        ref={ref}
        className={cn(
          cardFooterVariants({ align: resolvedAlign, density }),
          className
        )}
        {...props}
      />
    )
  }
)
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
}

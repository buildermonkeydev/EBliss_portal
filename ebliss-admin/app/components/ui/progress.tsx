"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "../../lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string
    showValue?: boolean
    value?: number
  }
>(({ className, value, indicatorClassName, showValue, ...props }, ref) => (
  <div className="relative w-full">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted/50 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out",
          "bg-gradient-to-r from-primary via-primary/80 to-primary/60",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
    {showValue && (
      <span className="absolute right-0 -top-6 text-xs font-medium text-muted-foreground">
        {Math.round(value || 0)}%
      </span>
    )}
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// Premium variants
const ProgressWithLabel = ({ 
  label, 
  value, 
  max = 100, 
  showPercentage = true,
  variant = "default" 
}: { 
  label: string
  value: number
  max?: number
  showPercentage?: boolean
  variant?: "default" | "success" | "warning" | "danger"
}) => {
  const percentage = (value / max) * 100
  
  const getGradient = () => {
    switch (variant) {
      case "success":
        return "bg-gradient-to-r from-green-500 via-green-400 to-green-500"
      case "warning":
        return "bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500"
      case "danger":
        return "bg-gradient-to-r from-red-500 via-red-400 to-red-500"
      default:
        return "bg-gradient-to-r from-primary via-primary/80 to-primary/60"
    }
  }
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {showPercentage && (
          <span className="text-muted-foreground">{Math.round(percentage)}%</span>
        )}
      </div>
      <Progress value={percentage} indicatorClassName={getGradient()} />
    </div>
  )
}

// Circular Progress Component
const CircularProgress = ({ 
  value, 
  size = 80, 
  strokeWidth = 8,
  label,
  variant = "default"
}: { 
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  variant?: "default" | "success" | "warning" | "danger"
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference
  
  const getColor = () => {
    switch (variant) {
      case "success": return "#22c55e"
      case "warning": return "#eab308"
      case "danger": return "#ef4444"
      default: return "hsl(var(--primary))"
    }
  }
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold">{Math.round(value)}%</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

export { Progress, ProgressWithLabel, CircularProgress }
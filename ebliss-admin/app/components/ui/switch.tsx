"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "../../lib/utils"
import { Check, X } from "lucide-react"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    variant?: "default" | "success" | "danger" | "warning"
    size?: "sm" | "default" | "lg"
    showIcon?: boolean
  }
>(({ className, variant = "default", size = "default", showIcon = false, ...props }, ref) => {
  const sizeClasses = {
    sm: "h-5 w-9 data-[state=checked]:translate-x-4",
    default: "h-6 w-11 data-[state=checked]:translate-x-5",
    lg: "h-7 w-14 data-[state=checked]:translate-x-7",
  }
  
  const thumbSizeClasses = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6",
  }
  
  const variantColors = {
    default: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
    success: "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-muted",
    danger: "data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-muted",
    warning: "data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-muted",
  }
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full",
        "transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses[size],
        variantColors[variant],
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
          thumbSizeClasses[size]
        )}
      >
        {showIcon && props.checked && (
          <Check className="absolute inset-0 m-auto h-3 w-3 text-green-500" />
        )}
        {showIcon && !props.checked && (
          <X className="absolute inset-0 m-auto h-3 w-3 text-muted-foreground" />
        )}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

// Premium Switch with label
const SwitchWithLabel = ({
  label,
  description,
  checked,
  onCheckedChange,
  variant = "default",
  size = "default",
  showIcon = true,
}: {
  label: string
  description?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  variant?: "default" | "success" | "danger" | "warning"
  size?: "sm" | "default" | "lg"
  showIcon?: boolean
}) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-200">
      <div className="space-y-0.5">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        variant={variant}
        size={size}
        showIcon={showIcon}
      />
    </div>
  )
}

// Grouped Switch component
const SwitchGroup = ({
  items,
  value,
  onChange,
}: {
  items: { label: string; value: string; description?: string }[]
  value: string[]
  onChange: (value: string[]) => void
}) => {
  const toggleItem = (itemValue: string) => {
    if (value.includes(itemValue)) {
      onChange(value.filter(v => v !== itemValue))
    } else {
      onChange([...value, itemValue])
    }
  }
  
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <SwitchWithLabel
          key={item.value}
          label={item.label}
          description={item.description}
          checked={value.includes(item.value)}
          onCheckedChange={() => toggleItem(item.value)}
        />
      ))}
    </div>
  )
}

export { Switch, SwitchWithLabel, SwitchGroup }
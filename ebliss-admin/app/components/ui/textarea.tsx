import * as React from "react"
import { cn } from "../../lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
  helperText?: string
  variant?: "default" | "filled" | "outline"
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, variant = "default", ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [charCount, setCharCount] = React.useState(0)
    const maxLength = props.maxLength
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length)
      props.onChange?.(e)
    }
    
    const variantStyles = {
      default: "border border-input bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
      filled: "border-0 bg-muted/50 focus:bg-muted focus:ring-2 focus:ring-primary/20",
      outline: "border-2 border-border bg-transparent focus:border-primary/50 focus:ring-0"
    }
    
    return (
      <div className="space-y-2">
        {label && (
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-foreground">
              {label}
            </label>
            {maxLength && (
              <span className="text-xs text-muted-foreground">
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <textarea
            className={cn(
              "flex min-h-[80px] w-full rounded-xl px-4 py-3 text-sm",
              "placeholder:text-muted-foreground/60",
              "transition-all duration-200 ease-out",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "resize-y",
              variantStyles[variant],
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            {...props}
          />
          {isFocused && (
            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground animate-fade-in">
              {props.placeholder}
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive animate-fade-in">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

// Premium variant with auto-resize
const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
    
    // Combine refs
    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        // Set internal ref
        textareaRef.current = node
        
        // Handle forwarded ref
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )
    
    React.useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      
      const adjustHeight = () => {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }
      
      adjustHeight()
      textarea.addEventListener('input', adjustHeight)
      
      return () => textarea.removeEventListener('input', adjustHeight)
    }, [])
    
    return (
      <Textarea
        ref={setRefs}
        className={cn("resize-none overflow-hidden", className)}
        {...props}
      />
    )
  }
)
AutoResizeTextarea.displayName = "AutoResizeTextarea"

// Rich Textarea with formatting (simplified)
const RichTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
    
    // Combine refs
    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        // Set internal ref
        textareaRef.current = node
        
        // Handle forwarded ref
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )
    
    const applyFormat = (format: string) => {
      const textarea = textareaRef.current
      if (!textarea) return
      
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const selectedText = text.substring(start, end)
      
      let formattedText = ''
      if (format === 'bold') {
        formattedText = `**${selectedText}**`
      } else if (format === 'italic') {
        formattedText = `*${selectedText}*`
      } else if (format === 'code') {
        formattedText = `\`${selectedText}\``
      }
      
      const newText = text.substring(0, start) + formattedText + text.substring(end)
      
      // Update the textarea value
      textarea.value = newText
      
      // Trigger change event
      const event = new Event('input', { bubbles: true })
      textarea.dispatchEvent(event)
      
      // Restore cursor position
      textarea.focus()
      const newCursorPos = start + formattedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }
    
    return (
      <div className="space-y-2">
        <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
          <button
            onClick={() => applyFormat('bold')}
            className="p-2 rounded hover:bg-muted transition-colors"
            type="button"
            title="Bold"
          >
            <span className="font-bold">B</span>
          </button>
          <button
            onClick={() => applyFormat('italic')}
            className="p-2 rounded hover:bg-muted transition-colors"
            type="button"
            title="Italic"
          >
            <span className="italic">I</span>
          </button>
          <button
            onClick={() => applyFormat('code')}
            className="p-2 rounded hover:bg-muted transition-colors"
            type="button"
            title="Code"
          >
            <span className="font-mono">{'</>'}</span>
          </button>
        </div>
        <Textarea
          ref={setRefs}
          className={cn("font-mono text-sm", className)}
          {...props}
        />
      </div>
    )
  }
)
RichTextarea.displayName = "RichTextarea"

export { Textarea, AutoResizeTextarea, RichTextarea }
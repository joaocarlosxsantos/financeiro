import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange?.(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      {/* Content */}
      <div className="relative z-10 max-h-[90vh] overflow-auto">
        {children}
      </div>
    </div>
  );
}

export interface DialogContentProps {
  className?: string;
  children?: React.ReactNode;
}

export function DialogContent({ className, children }: DialogContentProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-md w-full mx-4",
      className
    )}>
      {children}
    </div>
  );
}

export interface DialogHeaderProps {
  className?: string;
  children?: React.ReactNode;
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn("p-6 pb-4", className)}>
      {children}
    </div>
  );
}

export interface DialogTitleProps {
  className?: string;
  children?: React.ReactNode;
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold text-slate-900 dark:text-slate-100", className)}>
      {children}
    </h2>
  );
}

export interface DialogDescriptionProps {
  className?: string;
  children?: React.ReactNode;
}

export function DialogDescription({ className, children }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-slate-600 dark:text-slate-400 mt-2", className)}>
      {children}
    </p>
  );
}

export interface DialogFooterProps {
  className?: string;
  children?: React.ReactNode;
}

export function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div className={cn("p-6 pt-4 flex justify-end gap-2", className)}>
      {children}
    </div>
  );
}
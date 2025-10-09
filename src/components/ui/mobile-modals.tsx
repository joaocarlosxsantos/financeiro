/**
 * Componentes Mobile-First para Modais e Diálogos
 * Otimizados para touch e experiência mobile
 */

import React, { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============ MOBILE MODAL BASE ============

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

export const MobileModal = memo(({
  isOpen,
  onClose,
  children,
  className,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true
}: MobileModalProps) => {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Previne scroll do body
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // ESC para fechar
    const handleEsc = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };

    if (closeOnEsc) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      if (closeOnEsc) {
        document.removeEventListener('keydown', handleEsc);
      }
    };
  }, [isOpen, onClose, closeOnEsc]);

  if (!mounted || !isOpen) return null;

  const modalSizes = {
    sm: isMobile ? 'w-full h-full' : 'w-full max-w-md',
    md: isMobile ? 'w-full h-full' : 'w-full max-w-lg',
    lg: isMobile ? 'w-full h-full' : 'w-full max-w-2xl',
    xl: isMobile ? 'w-full h-full' : 'w-full max-w-4xl',
    full: 'w-full h-full'
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div
        className={cn(
          "relative bg-background shadow-lg z-10",
          modalSizes[size],
          isMobile ? [
            "rounded-none", // Sem bordas arredondadas no mobile
            "max-h-full",
            "flex flex-col"
          ] : [
            "rounded-lg",
            "max-h-[90vh]",
            "m-4"
          ],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className={cn(
              "absolute top-4 right-4 z-20",
              "w-8 h-8 rounded-full",
              "flex items-center justify-center",
              "bg-background/80 hover:bg-muted",
              "transition-colors duration-200",
              isMobile && [
                "w-10 h-10", // Maior no mobile
                "top-6 right-6"
              ]
            )}
          >
            <X className={cn(
              "h-4 w-4",
              isMobile && "h-5 w-5"
            )} />
          </button>
        )}
        
        {children}
      </div>
    </div>,
    document.body
  );
});

MobileModal.displayName = 'MobileModal';

// ============ MOBILE MODAL HEADER ============

interface MobileModalHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const MobileModalHeader = memo(({
  title,
  subtitle,
  onBack,
  actions,
  className
}: MobileModalHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "flex items-center justify-between p-6 border-b",
      isMobile && [
        "p-4", // Menos padding no mobile
        "min-h-[60px]" // Altura mínima para touch
      ],
      className
    )}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className={cn(
              "h-8 w-8",
              isMobile && "h-10 w-10" // Maior no mobile
            )}
          >
            <ChevronLeft className={cn(
              "h-4 w-4",
              isMobile && "h-5 w-5"
            )} />
          </Button>
        )}
        
        <div className="flex-1 min-w-0">
          <h2 className={cn(
            "text-lg font-semibold truncate",
            isMobile && "text-xl"
          )}>
            {title}
          </h2>
          {subtitle && (
            <p className={cn(
              "text-sm text-muted-foreground truncate",
              isMobile && "text-base"
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
});

MobileModalHeader.displayName = 'MobileModalHeader';

// ============ MOBILE MODAL CONTENT ============

interface MobileModalContentProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export const MobileModalContent = memo(({
  children,
  className,
  scrollable = true
}: MobileModalContentProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "flex-1",
      scrollable && "overflow-y-auto",
      isMobile ? "p-4" : "p-6",
      className
    )}>
      {children}
    </div>
  );
});

MobileModalContent.displayName = 'MobileModalContent';

// ============ MOBILE MODAL FOOTER ============

interface MobileModalFooterProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const MobileModalFooter = memo(({
  children,
  className,
  orientation = 'horizontal'
}: MobileModalFooterProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "p-6 border-t bg-muted/30",
      isMobile && "p-4",
      className
    )}>
      <div className={cn(
        "flex gap-3",
        // No mobile, força vertical se horizontal
        (isMobile && orientation === 'horizontal') ? "flex-col" : 
        orientation === 'vertical' ? "flex-col" : "flex-row justify-end",
        isMobile && "gap-4"
      )}>
        {children}
      </div>
    </div>
  );
});

MobileModalFooter.displayName = 'MobileModalFooter';

// ============ MOBILE BOTTOM SHEET ============

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
  className?: string;
}

export const MobileBottomSheet = memo(({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
  className
}: MobileBottomSheetProps) => {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [currentSnap, setCurrentSnap] = useState(snapPoints[initialSnap]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  // Se não for mobile, renderiza como modal normal
  if (!isMobile) {
    return (
      <MobileModal isOpen={isOpen} onClose={onClose} size="md">
        {title && (
          <MobileModalHeader title={title} />
        )}
        <MobileModalContent>
          {children}
        </MobileModalContent>
      </MobileModal>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        className={cn(
          "relative bg-background w-full rounded-t-xl shadow-lg z-10 transform transition-transform duration-300",
          className
        )}
        style={{ 
          height: `${currentSnap * 100}%`,
          maxHeight: '90vh'
        }}
      >
        {/* Handle */}
        <div className="flex justify-center p-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-4 pb-4">
            <h3 className="text-lg font-semibold text-center">
              {title}
            </h3>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
});

MobileBottomSheet.displayName = 'MobileBottomSheet';

// ============ MOBILE ALERT DIALOG ============

interface MobileAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: 'default' | 'destructive';
}

export const MobileAlertDialog = memo(({
  isOpen,
  onClose,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  variant = 'default'
}: MobileAlertDialogProps) => {
  const isMobile = useIsMobile();

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
    >
      <div className={cn(
        "p-6 text-center",
        isMobile && "p-4"
      )}>
        <h3 className={cn(
          "text-lg font-semibold mb-2",
          isMobile && "text-xl"
        )}>
          {title}
        </h3>
        
        <p className={cn(
          "text-sm text-muted-foreground mb-6",
          isMobile && "text-base mb-8"
        )}>
          {description}
        </p>
        
        <div className={cn(
          "flex gap-3",
          isMobile ? "flex-col" : "justify-center"
        )}>
          <Button
            variant="outline"
            onClick={onClose}
            className={cn(
              isMobile && "h-12 text-base"
            )}
          >
            {cancelText}
          </Button>
          
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            className={cn(
              isMobile && "h-12 text-base"
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </MobileModal>
  );
});

MobileAlertDialog.displayName = 'MobileAlertDialog';

// ============ EXPORTS ============

export const MobileModalComponents = {
  MobileModal,
  MobileModalHeader,
  MobileModalContent,
  MobileModalFooter,
  MobileBottomSheet,
  MobileAlertDialog
};
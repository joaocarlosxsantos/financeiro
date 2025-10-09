/**
 * Componentes Mobile-First para Formulários
 * Otimizados para touch e responsividade
 */

import React, { memo, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ============ MOBILE INPUT COMPONENTS ============

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const MobileInput = memo(forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
    const isMobile = useIsMobile();

    return (
      <div className="space-y-2 w-full">
        {label && (
          <Label 
            htmlFor={props.id}
            className={cn(
              "text-sm font-medium",
              isMobile && "text-base", // Maior no mobile
              error && "text-destructive"
            )}
          >
            {label}
          </Label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground",
              isMobile && "left-4" // Mais espaço no mobile
            )}>
              {leftIcon}
            </div>
          )}
          
          <Input
            ref={ref}
            className={cn(
              "w-full transition-all duration-200",
              leftIcon && (isMobile ? "pl-12" : "pl-10"),
              rightIcon && (isMobile ? "pr-12" : "pr-10"),
              isMobile && [
                "h-12", // Altura maior para touch
                "text-base", // Texto maior
                "px-4", // Padding maior
                "rounded-lg" // Bordas mais arredondadas
              ],
              error && "border-destructive focus:ring-destructive",
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className={cn(
              "absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground",
              isMobile && "right-4"
            )}>
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className={cn(
            "text-sm text-destructive",
            isMobile && "text-base"
          )}>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className={cn(
            "text-sm text-muted-foreground",
            isMobile && "text-base"
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
));

MobileInput.displayName = 'MobileInput';

// ============ MOBILE TEXTAREA ============

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const MobileTextarea = memo(forwardRef<HTMLTextAreaElement, MobileTextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const isMobile = useIsMobile();

    return (
      <div className="space-y-2 w-full">
        {label && (
          <Label 
            htmlFor={props.id}
            className={cn(
              "text-sm font-medium",
              isMobile && "text-base",
              error && "text-destructive"
            )}
          >
            {label}
          </Label>
        )}
        
        <textarea
          ref={ref}
          className={cn(
            "w-full bg-background border border-input rounded-md px-3 py-2",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-all duration-200 resize-none",
            isMobile && [
              "min-h-[120px]", // Altura mínima maior no mobile
              "text-base",
              "px-4 py-3",
              "rounded-lg"
            ],
            error && "border-destructive focus:ring-destructive",
            className
          )}
          {...props}
        />
        
        {error && (
          <p className={cn(
            "text-sm text-destructive",
            isMobile && "text-base"
          )}>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className={cn(
            "text-sm text-muted-foreground",
            isMobile && "text-base"
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
));

MobileTextarea.displayName = 'MobileTextarea';

// ============ MOBILE SELECT ============

interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const MobileSelect = memo(forwardRef<HTMLSelectElement, MobileSelectProps>(
  ({ className, label, error, helperText, options, placeholder, ...props }, ref) => {
    const isMobile = useIsMobile();

    return (
      <div className="space-y-2 w-full">
        {label && (
          <Label 
            htmlFor={props.id}
            className={cn(
              "text-sm font-medium",
              isMobile && "text-base",
              error && "text-destructive"
            )}
          >
            {label}
          </Label>
        )}
        
        <select
          ref={ref}
          className={cn(
            "w-full bg-background border border-input rounded-md px-3 py-2",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-all duration-200",
            isMobile && [
              "h-12",
              "text-base",
              "px-4",
              "rounded-lg"
            ],
            error && "border-destructive focus:ring-destructive",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {error && (
          <p className={cn(
            "text-sm text-destructive",
            isMobile && "text-base"
          )}>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className={cn(
            "text-sm text-muted-foreground",
            isMobile && "text-base"
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
));

MobileSelect.displayName = 'MobileSelect';

// ============ MOBILE BUTTON ============

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const MobileButton = memo(forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'default', 
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isMobile = useIsMobile();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled || loading}
        className={cn(
          "transition-all duration-200",
          isMobile && [
            "h-12", // Altura maior para touch
            "px-6", // Padding lateral maior
            "text-base", // Texto maior
            "rounded-lg", // Bordas mais arredondadas
            "min-w-[48px]" // Largura mínima para touch
          ],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {leftIcon && !loading && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </Button>
    );
  }
));

MobileButton.displayName = 'MobileButton';

// ============ MOBILE FORM GROUP ============

interface MobileFormGroupProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export const MobileFormGroup = memo(({ children, className, title, description }: MobileFormGroupProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "space-y-4",
      isMobile && "space-y-6", // Mais espaço no mobile
      className
    )}>
      {title && (
        <div className="space-y-2">
          <h3 className={cn(
            "text-lg font-semibold",
            isMobile && "text-xl"
          )}>
            {title}
          </h3>
          {description && (
            <p className={cn(
              "text-sm text-muted-foreground",
              isMobile && "text-base"
            )}>
              {description}
            </p>
          )}
        </div>
      )}
      <div className={cn(
        "space-y-4",
        isMobile && "space-y-6"
      )}>
        {children}
      </div>
    </div>
  );
});

MobileFormGroup.displayName = 'MobileFormGroup';

// ============ MOBILE FORM ACTIONS ============

interface MobileFormActionsProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const MobileFormActions = memo(({ 
  children, 
  className,
  orientation = 'horizontal' 
}: MobileFormActionsProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "flex gap-3",
      // No mobile, força vertical se não especificado
      (isMobile && orientation === 'horizontal') ? "flex-col" : 
      orientation === 'vertical' ? "flex-col" : "flex-row",
      isMobile && "gap-4", // Mais espaçamento no mobile
      className
    )}>
      {children}
    </div>
  );
});

MobileFormActions.displayName = 'MobileFormActions';

// ============ MOBILE CHECKBOX/RADIO ============

interface MobileCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export const MobileCheckbox = memo(forwardRef<HTMLInputElement, MobileCheckboxProps>(
  ({ className, label, description, ...props }, ref) => {
    const isMobile = useIsMobile();

    return (
      <div className="flex items-start space-x-3">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            "mt-1 h-4 w-4 text-primary focus:ring-ring border-input rounded",
            isMobile && [
              "h-5 w-5", // Maior no mobile
              "mt-0.5"
            ],
            className
          )}
          {...props}
        />
        <div className="space-y-1">
          <label className={cn(
            "text-sm font-medium leading-none",
            isMobile && "text-base",
            "cursor-pointer"
          )}>
            {label}
          </label>
          {description && (
            <p className={cn(
              "text-sm text-muted-foreground",
              isMobile && "text-base"
            )}>
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
));

MobileCheckbox.displayName = 'MobileCheckbox';

// ============ EXPORTS ============

export const MobileFormComponents = {
  MobileInput,
  MobileTextarea,
  MobileSelect,
  MobileButton,
  MobileFormGroup,
  MobileFormActions,
  MobileCheckbox
};
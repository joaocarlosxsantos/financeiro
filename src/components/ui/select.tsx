import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    const isMultiple = !!props.multiple;
    return (
      <select
        ref={ref}
        className={cn(
          // quando múltiplo, permitir altura maior e overflow auto; caso contrário, altura fixa
          'flex w-full rounded-md border border-input bg-background outline-none px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          isMultiple ? 'min-h-[96px] h-auto overflow-auto' : 'h-10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = 'Select';

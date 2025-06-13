'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, max = 100, ...props }, ref) => {
  // Validation de la prop max
  if (typeof max !== 'number' || max <= 0) {
    console.warn('Invalid prop max of value ' + max + ' supplied to Progress. Only numbers greater than 0 are valid max values. Defaulting to 100.');
    max = 100;
  }

  // Validation de la prop value
  if (value !== null && (typeof value !== 'number' || value < 0 || value > max)) {
    console.warn('Invalid prop value of value ' + value + ' supplied to Progress. The value prop must be a number between 0 and ' + max + '. Defaulting to 0.');
    value = 0;
  }

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      max={max}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

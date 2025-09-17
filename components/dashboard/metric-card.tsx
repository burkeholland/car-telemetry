"use client";
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value?: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
}

export function MetricCard({ title, value = '—', subtitle, footer, className, ...rest }: MetricCardProps) {
  return (
    <Card className={cn('h-full flex flex-col', className)} {...rest}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <div className="text-3xl font-semibold tabular-nums leading-none">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        {footer && <div className="mt-auto pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}

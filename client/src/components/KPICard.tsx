import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "default" | "amber" | "teal" | "violet" | "blue";
  className?: string;
  glow?: boolean;
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  variant = "default", 
  className,
  glow = false
}: KPICardProps) {
  
  const iconBgClasses = {
    default: "bg-muted text-muted-foreground",
    amber: "bg-amber-500/10 text-amber-500",
    teal: "bg-teal-500/10 text-teal-500",
    violet: "bg-violet-500/10 text-violet-500",
    blue: "bg-blue-500/10 text-blue-500"
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-shadow",
      glow && variant === "amber" && "hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]",
      glow && variant === "teal" && "hover:shadow-[0_0_15px_rgba(20,184,166,0.2)]",
      className
    )}>
      <CardContent className="p-6 relative">
        {icon && (
          <div className={cn("absolute right-6 top-6 w-10 h-10 rounded-full flex items-center justify-center", iconBgClasses[variant])}>
            {icon}
          </div>
        )}
        <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">{title}</span>
        <b className="text-3xl font-bold mt-2 block">{value}</b>
        {subtitle && <small className="text-muted-foreground text-xs mt-1 block">{subtitle}</small>}
      </CardContent>
    </Card>
  );
}

import { cn } from "@/shared/utils/cn";

interface BadgeProps {
  variant?: "sale" | "rental" | "both" | "default";
  children: React.ReactNode;
  className?: string;
}

/**
 * Ürün tipini gösteren etiket bileşeni
 * SALE → Yeşil, RENTAL → Mor, BOTH → Mavi
 */
export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          "bg-sale-100 text-sale-800": variant === "sale",
          "bg-rental-100 text-rental-800": variant === "rental",
          "bg-primary-100 text-primary-800": variant === "both",
          "bg-gray-100 text-gray-800": variant === "default",
        },
        className
      )}
    >
      {children}
    </span>
  );
}

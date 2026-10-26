import { cn } from "@/shared/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "rental" | "sale";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          {
            // Variants
            "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500 shadow-sm":
              variant === "primary",
            "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 focus-visible:ring-purple-500 shadow-sm":
              variant === "rental",
            "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 shadow-sm":
              variant === "sale",
            "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500":
              variant === "secondary",
            "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-500":
              variant === "outline",
            "bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm":
              variant === "danger",
            // Sizes
            "h-9 px-3 text-sm": size === "sm",
            "h-11 px-5 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };

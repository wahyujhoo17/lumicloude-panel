"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

const variantIcons = {
  success: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />,
  default: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        variant,
        ...props
      }) {
        const icon = variantIcons[variant || "default"];
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {icon}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

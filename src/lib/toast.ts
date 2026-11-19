import { toast as baseToast } from "sonner";
import { playSfx } from "@/lib/sfx";

/**
 * Drop-in replacement for sonner's `toast` that adds the quiet ambient
 * error / warning sounds. Everything else behaves exactly like sonner.
 */
export const toast = Object.assign(
  ((...args: Parameters<typeof baseToast>) => baseToast(...args)) as typeof baseToast,
  baseToast,
  {
    error: ((...args: Parameters<typeof baseToast.error>) => {
      playSfx("toast.error");
      return baseToast.error(...args);
    }) as typeof baseToast.error,
    warning: ((...args: Parameters<typeof baseToast.warning>) => {
      playSfx("toast.warning");
      return baseToast.warning(...args);
    }) as typeof baseToast.warning,
  },
);

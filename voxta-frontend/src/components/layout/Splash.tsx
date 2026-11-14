import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 app-backdrop">
      <BrandLogo size="lg" />
      <Loader2 className="h-5 w-5 animate-spin text-indigo-400" aria-label="Loading" />
    </div>
  );
}
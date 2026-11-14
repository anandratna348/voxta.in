import { ExternalLink, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { config } from "@/api/config";
import { useLicense } from "@/license/LicenseContext";
import { openExternal } from "@/lib/external";

interface NoticeProps {
  title: string;
  description?: string;
  compact?: boolean;
}

/** Shown where a feature is not part of the person's plan. */
export function UpgradeNotice({ title, description, compact }: NoticeProps) {
  return (
    <section
      role="status"
      className={`rounded-xl2 border border-lavender-200 bg-paper-raised shadow-card ${compact ? "flex items-center gap-4 p-5" : "p-10 text-center"}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ${compact ? "" : "mx-auto"}`}>
        <Lock className="h-5 w-5" />
      </div>
      <div className={compact ? "min-w-0 flex-1" : "mt-4"}>
        <h2 className="text-base font-bold text-indigo-950">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-indigo-500">
          {description ?? "This feature is not included in your current plan."}
        </p>
        <div className={`mt-3 flex flex-wrap gap-4 text-sm font-semibold ${compact ? "" : "justify-center"}`}>
          <Link to="/settings" className="text-indigo-600 hover:text-indigo-800">View your license</Link>
          {config.purchaseUrl && (
            <button onClick={() => void openExternal(config.purchaseUrl)} className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800">
              Compare plans <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function FeatureGate({ feature, title, children }: { feature: string; title: string; children: ReactNode }) {
  const { has } = useLicense();
  return has(feature) ? <>{children}</> : <UpgradeNotice title={`${title} is not in your plan`} />;
}
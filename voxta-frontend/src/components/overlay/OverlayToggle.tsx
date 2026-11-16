import { PictureInPicture2 } from "lucide-react";
import { isTauri } from "@/api/config";
import { Button } from "@/components/ui/Button";
import { closeOverlay, openOverlay } from "@/overlay/controller";
import { useOverlayState } from "@/overlay/useOverlay";

/** Opens or closes the floating overlay. Only shown in the desktop app. */
export function OverlayToggle() {
  const { open, error } = useOverlayState();
  if (!isTauri) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        icon={<PictureInPicture2 className="h-4 w-4" />}
        onClick={() => void (open ? closeOverlay() : openOverlay())}
        className={open ? "!border-lavender-300 !bg-indigo-50 !text-indigo-700" : ""}
      >
        {open ? "Close overlay" : "Open overlay"}
      </Button>
      {error && <p role="alert" className="max-w-xs text-right text-xs text-rose-700">{error}</p>}
    </div>
  );
}
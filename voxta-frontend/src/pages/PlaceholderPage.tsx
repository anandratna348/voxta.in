import { Hammer } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/ui/Feedback";

interface PlaceholderProps {
  title: string;
  description: string;
  step: string;
}

/** Honest stand-in for screens that are not built yet. Nothing here is simulated. */
export default function PlaceholderPage({ title, description, step }: PlaceholderProps) {
  const { sessionId } = useParams();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl text-indigo-900">{title}</h1>
        <p className="mt-2 text-indigo-500">{description}</p>
      </header>
      <EmptyState
        icon={<Hammer className="h-6 w-6" />}
        title="This screen is built in a later step"
        description={`${step}${sessionId ? ` Your meeting was created and is saved with id ${sessionId}.` : ""}`}
      />
    </div>
  );
}
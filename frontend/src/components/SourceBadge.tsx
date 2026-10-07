import { sourceLabel } from "../lib/format";

export function SourceBadge({ sourceType }: { sourceType: string | null | undefined }) {
  const kind = sourceType === "community" ? "community" : sourceType === "development" ? "development" : "unknown";
  return <span className={`source-badge ${kind}`}>{sourceLabel(sourceType)}</span>;
}

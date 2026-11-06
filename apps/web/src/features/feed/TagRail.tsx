import { useTags } from "@/lib/queries";
import { Chip } from "@/ui/Chip";

export function TagRail({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (t?: string) => void;
}) {
  const { data: tags = [] } = useTags();
  if (tags.length === 0) return null;
  return (
    <div
      role="group"
      aria-label="Filter by tag"
      className="-mx-4 flex [scrollbar-width:none] gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      <Chip active={!value} onClick={() => onChange(undefined)} layoutGroup="tag">
        Everything
      </Chip>
      {tags.map(({ tag, count }) => (
        <Chip key={tag} active={value === tag} onClick={() => onChange(tag)} layoutGroup="tag">
          #{tag} <span className="font-mono text-xs opacity-60">{count}</span>
        </Chip>
      ))}
    </div>
  );
}

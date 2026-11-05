import { Label } from "@/components/ui/label";

/** Label + control + first error message. `optional` adds a muted "(optional)". */
export function FormField({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label} {optional && <span className="text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {error?.[0] && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error[0]}
        </p>
      )}
    </div>
  );
}

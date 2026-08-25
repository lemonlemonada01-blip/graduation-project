import { cn } from "../../lib/utils";
import { Tooltip } from "./Tooltip";

interface AvatarProps {
  name: string;
  className?: string;
  colorClass?: string;
  showTooltip?: boolean;
}

export function Avatar({ name, className, colorClass, showTooltip = true }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
    
  const defaultColor = "from-indigo-500 to-purple-600";

  const content = (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br text-text-main font-bold shadow-sm cursor-help",
        colorClass || defaultColor,
        className
      )}
    >
      {initials}
    </div>
  );

  if (showTooltip) {
    return <Tooltip content={name}>{content}</Tooltip>;
  }

  return content;
}


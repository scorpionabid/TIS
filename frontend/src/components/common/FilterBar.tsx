import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type FilterBarProps = HTMLAttributes<HTMLDivElement>;

const Root = ({ className, ...props }: FilterBarProps) => (
  <div
    className={cn(
      "filter-bar",
      className
    )}
    {...props}
  />
);

const Group = ({ className, ...props }: FilterBarProps) => (
  <div
    className={cn(
      "filter-bar__group",
      className
    )}
    {...props}
  />
);

const Field = ({ className, ...props }: FilterBarProps) => (
  <div
    className={cn(
      "filter-bar__field",
      className
    )}
    {...props}
  />
);

const Actions = ({ className, ...props }: FilterBarProps) => (
  <div
    className={cn(
      "filter-bar__actions",
      className
    )}
    {...props}
  />
);

export const FilterBar = Object.assign(Root, {
  Group,
  Field,
  Actions,
});

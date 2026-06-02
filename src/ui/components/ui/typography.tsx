import * as React from "react";

import { cn } from "@/lib/utils";

export function TypographyP({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
      {...props}
    />
  );
}

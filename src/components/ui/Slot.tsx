import { cloneElement, isValidElement, type ReactNode } from "react";

/**
 * Minimal Slot: merges props onto a single child element so components like
 * <Button asChild> can render an <a>/<Link> while keeping their styling.
 */
export function Slot({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) {
  if (isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return cloneElement(child, {
      ...props,
      ...child.props,
      className: [props.className, child.props.className].filter(Boolean).join(" "),
    });
  }
  return null;
}

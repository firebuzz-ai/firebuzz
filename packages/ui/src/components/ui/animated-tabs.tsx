"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import * as React from "react";
import { buttonVariants } from "./button";

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  disabled?: boolean;
}

export interface TabButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const TabButton = React.forwardRef<HTMLButtonElement, TabButtonProps>(
  ({ active, disabled, className, children, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        disabled={disabled}
        className={cn(
          buttonVariants({
            variant: active ? "outline" : "ghost",
            className: cn(
              "!h-8 !px-2 flex items-center gap-1 !border",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground !border-transparent",
              disabled && "opacity-50 cursor-not-allowed"
            ),
          }),
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabButton.displayName = "TabButton";

export interface AnimatedTabsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  indicatorClassName?: string;
  tabsContainerClassName?: string;
  tabButtonClassName?: string;
  indicatorPadding?: number;
  asLinks?: boolean;
  currentPath?: string;
  /**
   * Component to use for links, typically Next.js Link component
   * Required when asLinks is true
   */
  linkComponent?: React.ComponentType<
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
      children: React.ReactNode;
    }
  >;
  /**
   * Whether to render the border around the tabs
   * @default true
   */
  withBorder?: boolean;
  /**
   * Whether to position the indicator relative to the parent container
   * Useful when you want to use the parent's border
   * @default false
   */
  indicatorRelativeToParent?: boolean;
}

export const AnimatedTabs = React.forwardRef<HTMLDivElement, AnimatedTabsProps>(
  (
    {
      tabs,
      value,
      defaultValue,
      onValueChange,
      indicatorClassName,
      tabsContainerClassName,
      tabButtonClassName,
      indicatorPadding = 8,
      linkComponent,
      asLinks = false,
      currentPath,
      withBorder = true,
      indicatorRelativeToParent = false,
      className,
      ...props
    },
    ref
  ) => {
    // Validate props
    if (asLinks && !linkComponent) {
      console.warn(
        "AnimatedTabs: linkComponent is required when asLinks is true"
      );
    }

    // For controlled/uncontrolled usage
    const [localValue, setLocalValue] = React.useState(
      defaultValue || (tabs[0]?.value ?? "")
    );
    const activeValue = value !== undefined ? value : localValue;

    // For indicator animation
    const tabsRef = React.useRef<
      (HTMLButtonElement | HTMLAnchorElement | null)[]
    >([]);
    const tabsContainerRef = React.useRef<HTMLDivElement | null>(null);
    const parentRef = React.useRef<HTMLDivElement | null>(null);
    const [indicatorStyle, setIndicatorStyle] =
      React.useState<React.CSSProperties>({
        width: 0,
        left: 0,
        opacity: 0,
      });

    // Function to set ref at specific index
    const setTabRef =
      (index: number) => (el: HTMLButtonElement | HTMLAnchorElement | null) => {
        tabsRef.current[index] = el;
      };

    // Update active tab (for inline tabs)
    const handleValueChange = (newValue: string) => {
      if (value === undefined) {
        setLocalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    // Pass ref to parentRef
    React.useImperativeHandle(ref, () => {
      return parentRef.current as HTMLDivElement;
    });

    // Update indicator position when active tab changes
    React.useEffect(() => {
      const activeTabIndex = tabs.findIndex((tab) =>
        asLinks ? tab.href === currentPath : tab.value === activeValue
      );

      if (
        activeTabIndex >= 0 &&
        tabsRef.current[activeTabIndex] &&
        tabsContainerRef.current
      ) {
        const activeTabElement = tabsRef.current[activeTabIndex];
        const containerRect = tabsContainerRef.current.getBoundingClientRect();
        // If indicatorRelativeToParent is true, use the parent's position
        const referenceRect =
          indicatorRelativeToParent && parentRef.current
            ? parentRef.current.getBoundingClientRect()
            : containerRect;
        const tabRect = activeTabElement.getBoundingClientRect();

        setIndicatorStyle({
          width: tabRect.width,
          left: tabRect.left + indicatorPadding - referenceRect.left,
          opacity: 1,
          transform: "translateX(0)",
        });
      }
    }, [
      activeValue,
      currentPath,
      tabs,
      asLinks,
      indicatorPadding,
      indicatorRelativeToParent,
    ]);

    const LinkComponent = linkComponent as React.ComponentType<{
      href: string;
      className?: string;
      "aria-disabled"?: boolean;
      children: React.ReactNode;
      ref?: React.Ref<HTMLAnchorElement>;
    }>;

    return (
      <div
        className={cn(
          "relative",
          withBorder && "border-b",
          "px-2 py-3",
          className
        )}
        ref={parentRef}
        {...props}
      >
        <div
          className={cn("flex items-center gap-2", tabsContainerClassName)}
          ref={tabsContainerRef}
        >
          {tabs.map((tab, index) => {
            // Determine if tab is active
            const isActive = asLinks
              ? tab.href === currentPath
              : tab.value === activeValue;

            // Create child content that's common to both button and link
            const content = (
              <React.Fragment key={`content-${tab.value}`}>
                {tab.icon && <tab.icon className="!size-3.5" />}
                <span>{tab.label}</span>
              </React.Fragment>
            );

            // Render either a button (for inline tabs) or a Link (for navigation)
            return asLinks && tab.href && linkComponent ? (
              <LinkComponent
                key={tab.value || tab.href}
                href={tab.href}
                className={cn(
                  buttonVariants({
                    variant: isActive ? "outline" : "ghost",
                    className: cn(
                      "!h-8 !px-2 flex items-center gap-1 !border",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground !border-transparent",
                      tab.disabled && "opacity-50 pointer-events-none"
                    ),
                  }),
                  tabButtonClassName
                )}
                ref={setTabRef(index)}
                aria-disabled={tab.disabled}
              >
                {content}
              </LinkComponent>
            ) : (
              <TabButton
                key={tab.value}
                active={isActive}
                disabled={tab.disabled}
                onClick={() => !tab.disabled && handleValueChange(tab.value)}
                ref={setTabRef(index)}
                className={tabButtonClassName}
              >
                {content}
              </TabButton>
            );
          })}
        </div>

        {/* Active tab indicator */}
        <div
          className={cn(
            "absolute bottom-0 h-px bg-primary transition-all duration-300",
            indicatorClassName
          )}
          style={indicatorStyle}
        />
      </div>
    );
  }
);
AnimatedTabs.displayName = "AnimatedTabs";

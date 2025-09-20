"use client";

import { Wordmark } from "@firebuzz/ui/components/brand/wordmark";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { Menu, X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

const navLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/templates", label: "Templates" },
  { href: "https://help.getfirebuzz.com", label: "Help Center" },
  { href: "/blog", label: "Blog" },
  { href: "/changelog", label: "Changelog" },
];

export const Navbar = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navContainerRef = React.useRef<HTMLDivElement | null>(null);
  const navLinksRef = React.useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] =
    React.useState<React.CSSProperties>({
      width: 0,
      left: 0,
      opacity: 0,
    });

  const setNavLinkRef = (index: number) => (el: HTMLAnchorElement | null) => {
    navLinksRef.current[index] = el;
  };

  React.useLayoutEffect(() => {
    const updateIndicatorPosition = () => {
      // Hide indicator on home page
      if (pathname === "/") {
        setIndicatorStyle({
          width: 0,
          left: 0,
          opacity: 0,
        });
        return true;
      }

      const activeNavIndex = navLinks.findIndex(
        (link) => link.href === pathname
      );

      if (
        activeNavIndex >= 0 &&
        navLinksRef.current[activeNavIndex] &&
        navContainerRef.current
      ) {
        const activeNavElement = navLinksRef.current[activeNavIndex];
        const containerRect = navContainerRef.current.getBoundingClientRect();
        const navRect = activeNavElement.getBoundingClientRect();

        if (navRect.width > 0 && containerRect.width > 0) {
          setIndicatorStyle({
            width: navRect.width,
            left: navRect.left - containerRect.left,
            opacity: 1,
            transform: "translateX(0)",
          });
          return true;
        }
      }
      return false;
    };

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    updateIndicatorPosition();

    for (const delay of [0, 50, 100, 200]) {
      const timeout = setTimeout(() => {
        updateIndicatorPosition();
      }, delay);
      timeouts.push(timeout);
    }

    return () => {
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    };
  }, [pathname]);

  // Close mobile menu when route changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent scroll when mobile menu is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 },
    },
    exit: {
      y: -10,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <>
      <div className="sticky top-0 z-50 border-b backdrop-blur-sm bg-muted">
        {/* Container */}
        <div className="flex justify-between items-center px-8 py-2 mx-auto max-w-6xl lg:py-0">
          {/* Logo */}
          <Link className="flex items-center shrink-0" href="/">
            <Wordmark className="h-4 text-foreground" />
          </Link>

          {/* Desktop Links */}
          <div className="hidden relative lg:block" ref={navContainerRef}>
            <div className="flex gap-1 items-center text-sm text-muted-foreground">
              {navLinks.map((link, index) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    ref={setNavLinkRef(index)}
                    className={cn(
                      "p-4 rounded-md transition-colors hover:text-foreground text-nowrap",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
            {/* Active page indicator */}
            <div
              className="absolute -bottom-px h-px transition-all duration-300"
              style={indicatorStyle}
            >
              {/* Main indicator line */}
              <div className="w-full h-full bg-gradient-to-r from-transparent to-transparent via-brand" />
              {/* Glowing light effect - strong in center, fades to edges */}
              <div className="absolute inset-x-0 -inset-y-1 bg-gradient-to-r from-transparent to-transparent opacity-30 blur-sm via-brand" />
              <div className="absolute inset-x-0 -inset-y-2 bg-gradient-to-r from-transparent to-transparent opacity-20 blur-md via-brand" />
              <div className="absolute inset-x-0 -inset-y-3 bg-gradient-to-r from-transparent to-transparent opacity-10 blur-lg via-brand" />
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden gap-2 items-center lg:flex">
            <Link
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "h-8",
              })}
              href="/"
            >
              Sign In
            </Link>
            <Link
              className={buttonVariants({
                variant: "brand",
                size: "sm",
                className: "h-8",
              })}
              href="/"
            >
              Start Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md transition-colors lg:hidden text-foreground hover:bg-muted"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 backdrop-blur-md bg-background/95"
              variants={backdropVariants}
            />

            {/* Menu Content */}
            <motion.div
              className="flex relative flex-col px-6 pt-20 h-full"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Navigation Links */}
              <motion.div className="space-y-6" variants={itemVariants}>
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <motion.div key={link.href} variants={itemVariants}>
                      <Link
                        href={link.href}
                        className={cn(
                          "block py-2 text-2xl font-medium transition-colors",
                          isActive
                            ? "text-brand"
                            : "text-foreground hover:text-brand"
                        )}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Mobile Actions */}
              <motion.div
                className="pb-8 mt-auto space-y-4"
                variants={itemVariants}
              >
                <Link
                  className={buttonVariants({
                    variant: "ghost",
                    size: "lg",
                    className: "justify-center w-full",
                  })}
                  href="/"
                >
                  Sign In
                </Link>
                <Link
                  className={buttonVariants({
                    variant: "brand",
                    size: "lg",
                    className: "justify-center w-full",
                  })}
                  href="/"
                >
                  Start Free
                </Link>
              </motion.div>

              {/* Bottom Text */}
              <motion.p
                className="pb-6 text-sm text-center text-muted-foreground"
                variants={itemVariants}
              >
                AI powered automation for PPC marketers
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

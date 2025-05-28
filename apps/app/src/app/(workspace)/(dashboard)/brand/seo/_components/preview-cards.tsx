"use client";

import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
  Globe,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Share,
  Shield,
} from "@firebuzz/ui/icons/lucide";
import {
  FacebookIcon,
  GoogleIcon,
  TwitterIcon,
} from "@firebuzz/ui/icons/social";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useMemo } from "react";
import type { BrandSeoType } from "./form";

interface PreviewCardsProps {
  formValues: BrandSeoType | null;
  brandName?: string;
  brandWebsite?: string;
  brandIconDark?: string;
  brandIconLight?: string;
  pageTitle: string;
}

export const PreviewCards = ({
  formValues,
  brandName,
  brandWebsite,
  brandIconDark,
  brandIconLight,
  pageTitle,
}: PreviewCardsProps) => {
  const { theme } = useTheme();
  const getDisplayUrl = () => {
    const url = brandWebsite || "https://example.com";
    try {
      return new URL(url).hostname;
    } catch {
      return "example.com";
    }
  };

  const metaTitle = useMemo(() => {
    const brand =
      formValues?.metaTitleTemplate && formValues?.metaTitleTemplate.length > 0
        ? formValues?.metaTitleTemplate
        : brandName;
    const divider =
      formValues?.metaTitleDivider && formValues?.metaTitleDivider.length > 0
        ? formValues?.metaTitleDivider
        : "|";
    const title = pageTitle && pageTitle.length > 0 ? pageTitle : "Home";
    return `${brand} ${divider} ${title}`;
  }, [
    formValues?.metaTitleTemplate,
    pageTitle,
    brandName,
    formValues?.metaTitleDivider,
  ]);

  const metaDescription = useMemo(() => {
    return formValues?.metaDescription && formValues?.metaDescription.length > 0
      ? formValues?.metaDescription
      : "Your meta description will appear here. Write a compelling description that encourages users to click through to your site.";
  }, [formValues?.metaDescription]);

  const getFullUrl = () => {
    return brandWebsite || "https://example.com";
  };

  const getBrandAvatar = () => {
    if (!brandIconDark || !brandIconLight || !formValues?.favicon) return null;

    if (theme === "dark")
      return brandIconDark ?? brandIconLight ?? formValues?.favicon;
    if (theme === "light")
      return brandIconLight ?? brandIconDark ?? formValues?.favicon;
  };

  return (
    <div className="space-y-8">
      {/* Google Search Preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-1 border rounded shadow-sm size-6 bg-background">
            <GoogleIcon />
          </div>
          <h3 className="text-sm font-medium">Google Search</h3>
        </div>

        <Card className="border rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* URL breadcrumb with favicon */}
              <div className="flex items-center gap-1.5 text-sm">
                {formValues?.favicon ? (
                  <Image
                    src={formValues?.favicon}
                    alt="Site favicon"
                    width={16}
                    height={16}
                    className="w-4 h-4 rounded-sm"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center w-4 h-4 rounded-sm bg-muted">
                    <Globe className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                )}
                <span className="text-muted-foreground">{getDisplayUrl()}</span>
                <span className="text-muted-foreground">›</span>
                <span className="text-xs text-muted-foreground">...</span>
              </div>

              {/* Full URL */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3 text-green-600" />
                <span className="text-green-700 dark:text-green-400">
                  {getFullUrl()}
                </span>
              </div>

              {/* Title */}
              <h4 className="text-xl text-[#1a0dab] dark:text-blue-400 hover:underline cursor-pointer leading-tight font-normal">
                {metaTitle}
              </h4>

              {/* Timestamp and cached link */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Dec 15, 2024</span>
                <span>•</span>
                <span className="text-blue-600 cursor-pointer dark:text-blue-400 hover:underline">
                  Cached
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-[#4d5156] dark:text-muted-foreground leading-relaxed">
                {metaDescription}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Twitter/X Preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-1 border rounded shadow-sm fill-primary size-6 bg-background">
            <TwitterIcon />
          </div>
          <h3 className="text-sm font-medium">Twitter / X</h3>
        </div>

        <Card className="border rounded-lg shadow-sm bg-card">
          <CardContent className="p-0">
            {/* Tweet Header */}
            <div className="flex items-start gap-3 p-3 pb-0">
              {getBrandAvatar() ? (
                <div className="flex items-center justify-center border rounded-full size-10 bg-background-subtle">
                  <Image
                    src={getBrandAvatar()!}
                    alt="Brand avatar"
                    width={16}
                    height={16}
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-white rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                  {brandName?.charAt(0) || "B"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[15px] text-foreground truncate">
                    {brandName || "Brand Name"}
                  </span>
                  <svg
                    className="w-[18px] h-[18px] text-blue-500 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-2.02-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 2.01-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.27 3.91.81c.67 1.31 2.01 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-2.01 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                  </svg>
                  <span className="text-muted-foreground text-[15px]">
                    @{brandName?.toLowerCase().replace(/\s+/g, "") || "brand"}
                  </span>
                  <span className="text-muted-foreground text-[15px]">·</span>
                  <span className="text-muted-foreground text-[15px]">2h</span>
                </div>
                <p className="text-[15px] leading-[20px] text-foreground">
                  Check out our latest updates! 🚀
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-[34px] h-[34px] rounded-full hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Tweet Content */}
            <div className="px-3 py-3">
              <div className="space-y-3">
                {/* Twitter Card */}
                <div className="overflow-hidden border border-border rounded-2xl bg-background">
                  {formValues?.twitterCard?.image && (
                    <div className="relative overflow-hidden aspect-video bg-muted">
                      <img
                        src={formValues?.twitterCard.image}
                        alt="Twitter Card"
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          e.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f3f4f6'/%3E%3Ctext x='200' y='100' text-anchor='middle' dy='0.3em' font-family='sans-serif' font-size='14' fill='%239ca3af'%3EImage Preview%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <div className="text-[13px] text-muted-foreground">
                      {getDisplayUrl()}
                    </div>
                    <h5 className="font-normal text-[15px] leading-tight line-clamp-2 text-foreground">
                      {formValues?.twitterCard?.title ||
                        formValues?.metaTitle ||
                        brandName ||
                        "Card Title"}
                    </h5>
                    <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {formValues?.twitterCard?.description ||
                        formValues?.metaDescription ||
                        "Description that appears when shared on X/Twitter."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tweet Engagement Line */}
            <div className="px-3 py-1 border-t border-border/50">
              <div className="text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">321</span> views
              </div>
            </div>

            {/* Tweet Actions */}
            <div className="px-3 py-2 border-t border-border/50">
              <div className="flex items-center justify-between max-w-[425px]">
                <div className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-blue-500 group">
                  <div className="p-2 transition-colors rounded-full group-hover:bg-blue-500/10">
                    <MessageCircle className="w-[18px] h-[18px]" />
                  </div>
                  <span className="text-[13px]">6</span>
                </div>
                <div className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-green-500 group">
                  <div className="p-2 transition-colors rounded-full group-hover:bg-green-500/10">
                    <Repeat2 className="w-[18px] h-[18px]" />
                  </div>
                  <span className="text-[13px]">4</span>
                </div>
                <div className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-red-500 group">
                  <div className="p-2 transition-colors rounded-full group-hover:bg-red-500/10">
                    <Heart className="w-[18px] h-[18px]" />
                  </div>
                  <span className="text-[13px]">9</span>
                </div>
                <div className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-blue-500 group">
                  <div className="p-2 transition-colors rounded-full group-hover:bg-blue-500/10">
                    <svg
                      className="w-[18px] h-[18px]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8.75 21V3h2v18l5.3-5.3 1.4 1.4L10 24.75l-7.45-7.45 1.4-1.4L8.75 21Z" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-blue-500 group">
                  <div className="p-2 transition-colors rounded-full group-hover:bg-blue-500/10">
                    <Share className="w-[18px] h-[18px]" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facebook Preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-1 border rounded shadow-sm size-6 bg-background">
            <FacebookIcon />
          </div>
          <h3 className="text-sm font-medium">Facebook</h3>
        </div>

        <Card className="border rounded-lg shadow-sm">
          <CardContent className="p-4">
            {/* Facebook Post Header */}
            <div className="flex items-start gap-3 mb-3">
              {getBrandAvatar() ? (
                <div className="flex items-center justify-center border rounded-full size-10 bg-background-subtle">
                  <Image
                    src={getBrandAvatar()!}
                    alt="Brand avatar"
                    width={16}
                    height={16}
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1877F2] to-blue-700 flex items-center justify-center text-white text-sm font-semibold">
                  {brandName?.charAt(0) || "B"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px]">
                    {brandName || "Brand Name"}
                  </span>
                  <svg
                    className="w-[18px] h-[18px] text-blue-500 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-2.02-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 2.01-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.27 3.91.81c.67 1.31 2.01 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-2.01 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                  </svg>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                  <span className="text-muted-foreground text-[13px]">
                    2 hours ago
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 p-1 rounded-full cursor-pointer text-muted-foreground hover:bg-muted" />
            </div>

            {/* Post Content */}
            <div className="space-y-3">
              <p className="text-[15px] leading-relaxed">
                Excited to share our latest updates with you! 🎉
              </p>

              {/* OpenGraph Card */}
              <div className="overflow-hidden border rounded-lg border-border bg-background">
                {formValues?.opengraph?.image && (
                  <div className="relative overflow-hidden aspect-video bg-muted">
                    <img
                      src={formValues?.opengraph.image}
                      alt="OpenGraph"
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.currentTarget.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f3f4f6'/%3E%3Ctext x='200' y='100' text-anchor='middle' dy='0.3em' font-family='sans-serif' font-size='14' fill='%239ca3af'%3EImage Preview%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                )}
                <div className="p-3 space-y-1 bg-muted/20">
                  <div className="text-[12px] text-muted-foreground uppercase font-medium tracking-wide">
                    {getDisplayUrl()}
                  </div>
                  <h5 className="font-semibold text-[16px] leading-tight line-clamp-2 text-foreground">
                    {formValues?.opengraph?.title ||
                      formValues?.metaTitle ||
                      brandName ||
                      "OpenGraph Title"}
                  </h5>
                  <p className="text-[14px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {formValues?.opengraph?.description ||
                      formValues?.metaDescription ||
                      "Description that appears when shared on Facebook and other social platforms."}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Facebook Engagement Stats */}
            <div className="flex items-center justify-between text-[13px] text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  <div className="z-10 flex items-center justify-center w-4 h-4 -mr-1 bg-blue-500 rounded-full">
                    <svg className="w-2 h-2 fill-white" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-center w-4 h-4 -mr-1 bg-yellow-500 rounded-full">
                    <span className="text-[8px]">😂</span>
                  </div>
                  <div className="flex items-center justify-center w-4 h-4 bg-orange-500 rounded-full">
                    <span className="text-[8px]">😮</span>
                  </div>
                </div>
                <span className="ml-1">47</span>
              </div>
              <div className="flex items-center gap-4">
                <span>12 comments</span>
                <span>3 shares</span>
              </div>
            </div>

            {/* Facebook Actions */}
            <div className="flex items-center justify-between pt-2 border-t text-muted-foreground">
              <div className="flex items-center flex-1 gap-4">
                <div className="flex items-center justify-center flex-1 gap-2 px-4 py-2 transition-colors rounded-md cursor-pointer hover:bg-muted">
                  <Heart className="w-[18px] h-[18px]" />
                  <span className="text-[15px] font-medium">Like</span>
                </div>
                <div className="flex items-center justify-center flex-1 gap-2 px-4 py-2 transition-colors rounded-md cursor-pointer hover:bg-muted">
                  <MessageCircle className="w-[18px] h-[18px]" />
                  <span className="text-[15px] font-medium">Comment</span>
                </div>
                <div className="flex items-center justify-center flex-1 gap-2 px-4 py-2 transition-colors rounded-md cursor-pointer hover:bg-muted">
                  <Share className="w-[18px] h-[18px]" />
                  <span className="text-[15px] font-medium">Share</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

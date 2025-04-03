import { Head as HeadComponent } from "vite-react-ssg";
import { seoConfiguration } from "./configuration/seo";

export function Head() {
  return (
    <HeadComponent>
      {/* Meta Tags */}
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{seoConfiguration.title}</title>
      <link
        rel="icon"
        type={seoConfiguration.iconType}
        href={seoConfiguration.icon}
      />
      <link rel="canonical" href={seoConfiguration.canonical} />
      {/* Open Graph */}
      <meta property="og:title" content={seoConfiguration.title} />
      <meta property="og:description" content={seoConfiguration.description} />
      <meta property="og:image" content={seoConfiguration.openGraph.image} />
      <meta property="og:url" content={seoConfiguration.openGraph.url} />
      <meta property="og:type" content={seoConfiguration.openGraph.type} />
      {/* Twitter */}
      <meta property="twitter:card" content={seoConfiguration.twitter.card} />
      <meta property="twitter:title" content={seoConfiguration.twitter.title} />
      <meta
        property="twitter:description"
        content={seoConfiguration.twitter.description}
      />
      <meta property="twitter:image" content={seoConfiguration.twitter.image} />
      <meta property="twitter:url" content={seoConfiguration.twitter.url} />
    </HeadComponent>
  );
}

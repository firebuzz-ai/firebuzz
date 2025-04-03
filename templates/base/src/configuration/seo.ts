// LLM Directives:
// - You are not allowed to change any key in the seoConfiguration object
// - You can change the values based on user requests e.g. "I want to change the meta title to 'My new title'"

export const seoConfiguration = {
  title: "Hello World",
  description: "My custom description",
  canonical: "http://mysite.com/example",
  iconType: "image/svg+xml",
  icon: "/vite.svg",
  openGraph: {
    title: "Hello World",
    description: "My custom description",
    image: "https://mysite.com/image.png",
    url: "http://mysite.com/example",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hello World",
    description: "My custom description",
    image: "https://mysite.com/image.png",
    url: "http://mysite.com/example",
  },
};

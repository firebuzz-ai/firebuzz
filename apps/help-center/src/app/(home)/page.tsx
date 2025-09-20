'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-fd-foreground">
          How can we help?
        </h1>
        <p className="text-lg text-fd-muted-foreground mb-8">
          Get answers to common questions
          <br />
          on all things Firebuzz
        </p>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-6">
          <button
            type="button"
            onClick={() => {
              // Trigger search dialog by dispatching keyboard shortcut
              const event = new KeyboardEvent('keydown', {
                key: 'k',
                code: 'KeyK',
                metaKey: true,
                bubbles: true
              });
              document.dispatchEvent(event);
            }}
            className="w-full text-left pl-12 pr-4 py-3 rounded-lg border border-fd-border bg-fd-background text-fd-muted-foreground hover:border-fd-primary/20 hover:bg-fd-muted/30 focus:outline-none focus:ring-2 focus:ring-fd-primary focus:border-transparent transition-all duration-200"
          >
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 text-fd-muted-foreground w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            Search help (e.g. integrations, importing, or billing)
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-fd-muted-foreground text-sm">
              ⌘ K
            </div>
          </button>
        </div>

        {/* Popular Searches */}
        <div className="flex flex-wrap justify-center gap-3">
          <span className="text-sm text-fd-muted-foreground">Popular searches:</span>
          <button type="button" className="px-3 py-1 text-sm bg-fd-muted text-fd-muted-foreground rounded-md hover:bg-fd-accent transition-colors">
            importing
          </button>
          <button type="button" className="px-3 py-1 text-sm bg-fd-muted text-fd-muted-foreground rounded-md hover:bg-fd-accent transition-colors">
            billing
          </button>
          <button type="button" className="px-3 py-1 text-sm bg-fd-muted text-fd-muted-foreground rounded-md hover:bg-fd-accent transition-colors">
            integrations
          </button>
        </div>
      </div>

      {/* Main Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Academy */}
        <Link
          href="/docs/academy"
          className="group p-8 bg-fd-card border border-fd-border rounded-lg hover:shadow-lg transition-all duration-200 hover:border-fd-primary/20"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-fd-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-fd-foreground group-hover:text-fd-primary transition-colors">
              Academy
            </h3>
            <p className="text-fd-muted-foreground">
              Short videos to get started with Firebuzz
            </p>
          </div>
        </Link>

        {/* Management */}
        <Link
          href="/docs/management"
          className="group p-8 bg-fd-card border border-fd-border rounded-lg hover:shadow-lg transition-all duration-200 hover:border-fd-primary/20"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-fd-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.1.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-fd-foreground group-hover:text-fd-primary transition-colors">
              Management
            </h3>
            <p className="text-fd-muted-foreground">
              Essential Firebuzz features explained
            </p>
          </div>
        </Link>

        {/* Integrations */}
        <Link
          href="/docs/integrations"
          className="group p-8 bg-fd-card border border-fd-border rounded-lg hover:shadow-lg transition-all duration-200 hover:border-fd-primary/20"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-fd-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-fd-foreground group-hover:text-fd-primary transition-colors">
              Integrations
            </h3>
            <p className="text-fd-muted-foreground">
              Technical guide to integrations
            </p>
          </div>
        </Link>
      </div>

      {/* Get Started Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-fd-foreground">
            Get started <span className="text-fd-muted-foreground">with</span>
          </h2>
          <h3 className="text-2xl font-bold mb-4 text-fd-foreground">
            Firebuzz 101.
          </h3>
          <p className="text-fd-muted-foreground mb-6">
            Everything you need to master the basics of Firebuzz.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-fd-primary text-fd-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="font-semibold text-fd-foreground mb-1">Introduction</h4>
              <p className="text-fd-muted-foreground text-sm">
                Learn why Firebuzz is the future of marketing automation.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-fd-primary text-fd-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="font-semibold text-fd-foreground mb-1">Introduction to navigating Firebuzz</h4>
              <p className="text-fd-muted-foreground text-sm">
                Get to know your way around Firebuzz.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-fd-primary text-fd-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="font-semibold text-fd-foreground mb-1">Introduction to campaigns and automation</h4>
              <p className="text-fd-muted-foreground text-sm">
                How to get up and running with Firebuzz in just a few minutes.
              </p>
            </div>
          </div>

          <Link
            href="/docs/academy"
            className="inline-block text-fd-muted-foreground hover:text-fd-foreground transition-colors text-sm"
          >
            See all articles...
          </Link>
        </div>
      </div>
    </main>
  );
}

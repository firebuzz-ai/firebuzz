import { Head as HeadComponent } from "vite-react-ssg";
import { seoConfiguration } from "./configuration/seo";
import { tagsConfiguration } from "./configuration/tags";

export function Head() {
	return (
		<HeadComponent>
			{/* Meta Tags */}
			<meta charSet="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<meta
				name="robots"
				content={
					seoConfiguration.indexable ? "index, follow" : "noindex, nofollow"
				}
			/>
			<meta name="description" content={seoConfiguration.description} />
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
			{/* Google Site Verification Tag */}
			{tagsConfiguration.googleSiteVerificationId && (
				<meta
					name="google-site-verification"
					content={tagsConfiguration.googleSiteVerificationId}
				/>
			)}

			{/* Google Tag Manager Tag */}
			{tagsConfiguration.googleTagManagerId && (
				<script>
					{`
     (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${tagsConfiguration.googleTagManagerId}');
            `}
				</script>
			)}

			{/* Google Analytics Tags */}
			{tagsConfiguration.googleAnalyticsId && (
				<>
					<script
						async
						src={`https://www.googletagmanager.com/gtag/js?id=${tagsConfiguration.googleAnalyticsId}`}
					/>
					<script>
						{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${tagsConfiguration.googleAnalyticsId}');
            `}
					</script>
				</>
			)}

			{/* Facebook Pixel Tag */}
			{tagsConfiguration.facebookPixelId && (
				<>
					<script async src="https://connect.facebook.net/en_US/fbevents.js" />
					<script>{`
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];}(window, document,'script');

  fbq('init', '${tagsConfiguration.facebookPixelId}');
  fbq('track', 'PageView');
`}</script>
				</>
			)}
		</HeadComponent>
	);
}

import { Hono } from 'hono';
import { previewCampaignApp } from './campaign';
import { previewLandingApp } from './landing';

const app = new Hono<{ Bindings: Env }>();

// Preview [Landing Page]
app.route('/landing', previewLandingApp);

// Preview [Campaign]
app.route('/campaign', previewCampaignApp);

// Root route - handles both subdomain root and redirect
app.get('/', async (c) => {
	const hostname = c.req.header('host') || '';

	// If accessed from preview subdomain, show preview index
	if (hostname === 'preview.getfirebuzz.com') {
		return c.html(`
			<html>
				<head>
					<title>Firebuzz Preview</title>
					<style>
						body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
						h1 { color: #ff6b00; }
						.previews { display: grid; gap: 1rem; }
					</style>
				</head>
				<body>
					<h1>Firebuzz Preview</h1>
					<p>Enter a slug to view a preview</p>
				</body>
			</html>
		`);
	}

	// Otherwise redirect to main site
	return c.redirect('https://getfirebuzz.com');
});

export { app as previewApp };

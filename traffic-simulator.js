#!/usr/bin/env node

/**
 * Firebuzz Landing Page Traffic Simulator
 *
 * This script simulates website traffic to your Firebuzz landing pages
 * and collects detailed metrics including response times, status codes,
 * and performance statistics.
 */

const https = require("https");
const http = require("http");
const { URL } = require("url");
const fs = require("fs");

// Configuration - Update these values for your landing page
const CONFIG = {
	// Landing page URL (update this to your actual landing page URL)
	url: "https://lufian2.frbzz.com/test-gdpr",

	// Traffic simulation settings
	totalRequests: 50, // Total number of requests to send (reduced to be less aggressive)
	concurrentRequests: 3, // Number of concurrent requests (reduced to avoid rate limiting)
	requestDelay: 2000, // Delay between batches (increased to 2s)

	// Country simulation settings
	countries: [
		{
			name: "United States",
			code: "US",
			weight: 0.3, // 30% of traffic
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
			],
			acceptLanguage: "en-US,en;q=0.9",
			ipRanges: ["192.0.2.", "198.51.100.", "203.0.113."], // Example IP ranges
		},
		{
			name: "United Kingdom",
			code: "GB",
			weight: 0.15,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
			],
			acceptLanguage: "en-GB,en;q=0.9",
			ipRanges: ["81.2.69.", "86.1.", "2.25."],
		},
		{
			name: "Germany",
			code: "DE",
			weight: 0.12,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
			],
			acceptLanguage: "de-DE,de;q=0.9,en;q=0.8",
			ipRanges: ["85.214.", "217.6.", "62.154."],
		},
		{
			name: "France",
			code: "FR",
			weight: 0.1,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			],
			acceptLanguage: "fr-FR,fr;q=0.9,en;q=0.8",
			ipRanges: ["78.192.", "90.2.", "193.252."],
		},
		{
			name: "Canada",
			code: "CA",
			weight: 0.08,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			],
			acceptLanguage: "en-CA,en;q=0.9,fr;q=0.8",
			ipRanges: ["24.156.", "70.53.", "184.71."],
		},
		{
			name: "Australia",
			code: "AU",
			weight: 0.07,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
			],
			acceptLanguage: "en-AU,en;q=0.9",
			ipRanges: ["1.128.", "27.32.", "103.2."],
		},
		{
			name: "Japan",
			code: "JP",
			weight: 0.06,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			],
			acceptLanguage: "ja-JP,ja;q=0.9,en;q=0.8",
			ipRanges: ["126.", "210.", "61."],
		},
		{
			name: "Brazil",
			code: "BR",
			weight: 0.05,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			],
			acceptLanguage: "pt-BR,pt;q=0.9,en;q=0.8",
			ipRanges: ["177.", "189.", "201."],
		},
		{
			name: "India",
			code: "IN",
			weight: 0.05,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
			],
			acceptLanguage: "en-IN,en;q=0.9,hi;q=0.8",
			ipRanges: ["117.", "125.", "103."],
		},
		{
			name: "Netherlands",
			code: "NL",
			weight: 0.02,
			userAgents: [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			],
			acceptLanguage: "nl-NL,nl;q=0.9,en;q=0.8",
			ipRanges: ["85.17.", "213.75.", "62.194."],
		},
	],

	// Referrer URLs to simulate traffic sources
	referrers: [
		"https://google.com",
		"https://facebook.com",
		"https://twitter.com",
		"https://linkedin.com",
		"", // Direct traffic
	],

	// Output settings
	outputFile: `traffic-test-${Date.now()}.json`,
	verbose: true,
};

// Statistics tracking
const stats = {
	totalRequests: 0,
	successfulRequests: 0,
	failedRequests: 0,
	responseTimes: [],
	statusCodes: {},
	errors: [],
	startTime: null,
	endTime: null,
	requests: [],
};

// Utility functions
function getRandomElement(array) {
	return array[Math.floor(Math.random() * array.length)];
}

function selectCountryByWeight() {
	const random = Math.random();
	let cumulative = 0;

	for (const country of CONFIG.countries) {
		cumulative += country.weight;
		if (random <= cumulative) {
			return country;
		}
	}

	// Fallback to first country if weights don't add up to 1
	return CONFIG.countries[0];
}

function generateRandomIP(ipRange) {
	const parts = ipRange.split(".");
	const ip = [...parts];

	// Fill in missing octets with random numbers
	while (ip.length < 4) {
		ip.push(Math.floor(Math.random() * 256).toString());
	}

	// Replace empty parts with random numbers
	for (let i = 0; i < ip.length; i++) {
		if (ip[i] === "" || ip[i] === undefined) {
			ip[i] = Math.floor(Math.random() * 256).toString();
		}
	}

	return ip.join(".");
}

function makeRequest(url, options = {}) {
	return new Promise((resolve) => {
		const parsedUrl = new URL(url);
		const isHttps = parsedUrl.protocol === "https:";
		const client = isHttps ? https : http;

		// Select a random country based on weights
		const selectedCountry = selectCountryByWeight();
		const userAgent = getRandomElement(selectedCountry.userAgents);
		const ipRange = getRandomElement(selectedCountry.ipRanges);
		const fakeIP = generateRandomIP(ipRange);

		const requestOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || (isHttps ? 443 : 80),
			path: parsedUrl.pathname + parsedUrl.search,
			method: "GET",
			headers: {
				"User-Agent": userAgent,
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"Accept-Language": selectedCountry.acceptLanguage,
				"Accept-Encoding": "gzip, deflate, br",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Upgrade-Insecure-Requests": "1",
				"Sec-Fetch-Site": "none",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-User": "?1",
				"Sec-Fetch-Dest": "document",
				"sec-ch-ua":
					'"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": '"Windows"',
				DNT: "1", // Do Not Track
				// Remove simulated IP headers as they might trigger bot detection
				// "X-Forwarded-For": fakeIP,
				// "X-Real-IP": fakeIP,
				// "CF-Connecting-IP": fakeIP,
				...options.headers,
			},
			timeout: 30000,
		};

		// Add referrer if provided
		const referrer = getRandomElement(CONFIG.referrers);
		if (referrer) {
			requestOptions.headers["Referer"] = referrer;
		}

		const startTime = Date.now();

		const req = client.request(requestOptions, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				const endTime = Date.now();
				const responseTime = endTime - startTime;

				resolve({
					success: true,
					statusCode: res.statusCode,
					responseTime,
					headers: res.headers,
					bodyLength: data.length,
					timestamp: new Date().toISOString(),
					referrer,
					userAgent: requestOptions.headers["User-Agent"],
					country: selectedCountry.name,
					countryCode: selectedCountry.code,
					simulatedIP: fakeIP,
				});
			});
		});

		req.on("error", (error) => {
			const endTime = Date.now();
			const responseTime = endTime - startTime;

			resolve({
				success: false,
				error: error.message,
				responseTime,
				timestamp: new Date().toISOString(),
				referrer,
				userAgent: requestOptions.headers["User-Agent"],
				country: selectedCountry.name,
				countryCode: selectedCountry.code,
				simulatedIP: fakeIP,
			});
		});

		req.on("timeout", () => {
			req.destroy();
			const endTime = Date.now();
			const responseTime = endTime - startTime;

			resolve({
				success: false,
				error: "Request timeout",
				responseTime,
				timestamp: new Date().toISOString(),
				referrer,
				userAgent: requestOptions.headers["User-Agent"],
				country: selectedCountry.name,
				countryCode: selectedCountry.code,
				simulatedIP: fakeIP,
			});
		});

		req.end();
	});
}

async function simulateTraffic() {
	console.log("🚀 Starting Firebuzz Landing Page Traffic Simulation");
	console.log(`📊 URL: ${CONFIG.url}`);
	console.log(`🎯 Total Requests: ${CONFIG.totalRequests}`);
	console.log(`⚡ Concurrent Requests: ${CONFIG.concurrentRequests}`);
	console.log(`⏱️  Request Delay: ${CONFIG.requestDelay}ms`);
	console.log("🛡️  Cloudflare-optimized headers enabled");
	console.log("---");

	stats.startTime = Date.now();

	const batches = Math.ceil(CONFIG.totalRequests / CONFIG.concurrentRequests);

	for (let batch = 0; batch < batches; batch++) {
		const requestsInBatch = Math.min(
			CONFIG.concurrentRequests,
			CONFIG.totalRequests - batch * CONFIG.concurrentRequests,
		);

		console.log(
			`📦 Batch ${batch + 1}/${batches}: Sending ${requestsInBatch} requests...`,
		);

		const batchPromises = [];
		for (let i = 0; i < requestsInBatch; i++) {
			// Add random delay between individual requests in batch (0-500ms)
			const randomDelay = Math.random() * 500;
			batchPromises.push(
				new Promise((resolve) =>
					setTimeout(() => resolve(makeRequest(CONFIG.url)), randomDelay),
				),
			);
		}

		const results = await Promise.all(batchPromises);

		// Process results
		results.forEach((result) => {
			stats.totalRequests++;
			stats.requests.push(result);

			if (result.success) {
				stats.successfulRequests++;
				stats.responseTimes.push(result.responseTime);

				// Track status codes
				const statusCode = result.statusCode.toString();
				stats.statusCodes[statusCode] =
					(stats.statusCodes[statusCode] || 0) + 1;

				if (CONFIG.verbose) {
					console.log(
						`✅ ${result.statusCode} - ${result.responseTime}ms - ${result.bodyLength} bytes - ${result.country} (${result.simulatedIP})`,
					);
				}
			} else {
				stats.failedRequests++;
				stats.errors.push(result.error);

				if (CONFIG.verbose) {
					console.log(
						`❌ Error: ${result.error} - ${result.responseTime}ms - ${result.country} (${result.simulatedIP})`,
					);
				}
			}
		});

		// Delay before next batch (except for the last batch)
		if (batch < batches - 1) {
			await new Promise((resolve) => setTimeout(resolve, CONFIG.requestDelay));
		}
	}

	stats.endTime = Date.now();
}

function calculateStatistics() {
	if (stats.responseTimes.length === 0) {
		return {
			avgResponseTime: 0,
			minResponseTime: 0,
			maxResponseTime: 0,
			p95ResponseTime: 0,
			p99ResponseTime: 0,
		};
	}

	const sortedTimes = stats.responseTimes.sort((a, b) => a - b);
	const count = sortedTimes.length;

	return {
		avgResponseTime: Math.round(sortedTimes.reduce((a, b) => a + b, 0) / count),
		minResponseTime: sortedTimes[0],
		maxResponseTime: sortedTimes[count - 1],
		p95ResponseTime: sortedTimes[Math.floor(count * 0.95)],
		p99ResponseTime: sortedTimes[Math.floor(count * 0.99)],
	};
}

function printResults() {
	const duration = stats.endTime - stats.startTime;
	const calculations = calculateStatistics();

	console.log("\n🎉 Traffic Simulation Complete!");
	console.log("=====================================");
	console.log(
		`⏱️  Total Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`,
	);
	console.log(`📊 Total Requests: ${stats.totalRequests}`);
	console.log(
		`✅ Successful: ${stats.successfulRequests} (${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%)`,
	);
	console.log(
		`❌ Failed: ${stats.failedRequests} (${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%)`,
	);
	console.log(
		`🚀 Requests/sec: ${((stats.totalRequests / duration) * 1000).toFixed(2)}`,
	);

	console.log("\n📈 Response Time Statistics:");
	console.log(`   Average: ${calculations.avgResponseTime}ms`);
	console.log(`   Min: ${calculations.minResponseTime}ms`);
	console.log(`   Max: ${calculations.maxResponseTime}ms`);
	console.log(`   95th percentile: ${calculations.p95ResponseTime}ms`);
	console.log(`   99th percentile: ${calculations.p99ResponseTime}ms`);

	console.log("\n📋 Status Code Distribution:");
	Object.entries(stats.statusCodes)
		.sort(([a], [b]) => a.localeCompare(b))
		.forEach(([code, count]) => {
			const percentage = ((count / stats.successfulRequests) * 100).toFixed(1);
			console.log(`   ${code}: ${count} requests (${percentage}%)`);
		});

	// Country distribution
	const countryStats = {};
	stats.requests.forEach((req) => {
		if (req.country) {
			countryStats[req.country] = (countryStats[req.country] || 0) + 1;
		}
	});

	console.log("\n🌍 Traffic by Country:");
	Object.entries(countryStats)
		.sort(([, a], [, b]) => b - a) // Sort by count descending
		.forEach(([country, count]) => {
			const percentage = ((count / stats.totalRequests) * 100).toFixed(1);
			console.log(`   ${country}: ${count} requests (${percentage}%)`);
		});

	if (stats.errors.length > 0) {
		console.log("\n🚨 Unique Errors:");
		const uniqueErrors = [...new Set(stats.errors)];
		uniqueErrors.forEach((error) => {
			const count = stats.errors.filter((e) => e === error).length;
			console.log(`   ${error}: ${count} occurrences`);
		});
	}
}

function saveResults() {
	const report = {
		config: CONFIG,
		summary: {
			totalRequests: stats.totalRequests,
			successfulRequests: stats.successfulRequests,
			failedRequests: stats.failedRequests,
			duration: stats.endTime - stats.startTime,
			requestsPerSecond:
				(stats.totalRequests / (stats.endTime - stats.startTime)) * 1000,
			...calculateStatistics(),
		},
		statusCodes: stats.statusCodes,
		errors: [...new Set(stats.errors)].map((error) => ({
			error,
			count: stats.errors.filter((e) => e === error).length,
		})),
		requests: stats.requests,
	};

	fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));
	console.log(`\n💾 Detailed results saved to: ${CONFIG.outputFile}`);
}

// Main execution
async function main() {
	try {
		// Validate URL
		new URL(CONFIG.url);

		await simulateTraffic();
		printResults();
		saveResults();
	} catch (error) {
		console.error("❌ Error running traffic simulation:", error.message);
		console.error(
			"\n💡 Make sure to update the CONFIG.url in the script with your actual landing page URL",
		);
		process.exit(1);
	}
}

// Handle script arguments
if (process.argv.length > 2) {
	const url = process.argv[2];
	try {
		new URL(url);
		CONFIG.url = url;
		console.log(`🎯 Using URL from command line: ${url}`);
	} catch {
		console.error("❌ Invalid URL provided as argument");
		process.exit(1);
	}
}

// Run the simulation
if (require.main === module) {
	main();
}

module.exports = { makeRequest, simulateTraffic, CONFIG };

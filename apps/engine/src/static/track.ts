import { getContentType } from "@/utils/assets";
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Static asset route for tracking script
app.get("/", async (c) => {
	try {
		// Read the tracking script from the static directory
		// In a real deployment, this would be served from a CDN or static file server
		// For now, we'll return the script content directly
		const trackingScript = `/**
 * Firebuzz External Event Tracking Script
 *
 * This script is designed to be loaded on external websites via Google Tag Manager.
 * It extracts the tracking token from URL parameters and exposes a global method
 * for tracking events that occurred on external sites.
 */
(function() {
  'use strict';

  // Configuration
  var CONFIG = {
    API_BASE_URL: '${c.env.ENVIRONMENT === "production" ? "https://engine.frbzz.com" : c.env.ENVIRONMENT === "preview" ? "https://engine-preview.frbzz.com" : "https://engine-dev.frbzz.com"}/client-api/v1/events',
    TOKEN_PARAM: 'frbzz_ci',
    GLOBAL_METHOD: 'frbzztrack',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    DEBUG: true
  };

  // State
  var state = {
    token: null,
    initialized: false,
    eventQueue: []
  };

  // Utility functions
  function log(message) {
    if (CONFIG.DEBUG && typeof console !== 'undefined') {
      console.log('[Firebuzz] ' + message);
    }
  }

  function getUrlParameter(name) {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(name);
    } catch (e) {
      // Fallback for older browsers
      var regex = new RegExp('[?&]' + name + '=([^&#]*)');
      var results = regex.exec(window.location.search);
      return results ? decodeURIComponent(results[1].replace(/\\+/g, ' ')) : null;
    }
  }

  function sendEventToAPI(eventData, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', CONFIG.API_BASE_URL + '/external-track', true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          log('Event tracked successfully');
          callback(null, true);
        } else {
          log('Failed to track event: ' + xhr.status);
          callback(new Error('HTTP ' + xhr.status), false);
        }
      }
    };

    xhr.onerror = function() {
      log('Network error while tracking event');
      callback(new Error('Network error'), false);
    };

    try {
      xhr.send(JSON.stringify(eventData));
    } catch (e) {
      callback(e, false);
    }
  }

  function retryWithBackoff(fn, retries, delay, callback) {
    fn(function(error, success) {
      if (success || retries <= 0) {
        callback(error, success);
        return;
      }

      setTimeout(function() {
        retryWithBackoff(fn, retries - 1, delay * 2, callback);
      }, delay);
    });
  }

  // Helper function to get viewport dimensions
  function getViewportDimensions() {
    try {
      return {
        width: window.innerWidth || document.documentElement.clientWidth || 0,
        height: window.innerHeight || document.documentElement.clientHeight || 0
      };
    } catch (e) {
      return { width: null, height: null };
    }
  }

  function processEvent(eventId, eventValue, eventValueCurrency, eventValueType) {
    // Validate event ID (required)
    if (!eventId || typeof eventId !== 'string') {
      log('Error: event_id is required and must be a string');
      return false;
    }

    // Check if click ID is available
    if (!state.token) {
      log('Warning: No Firebuzz click ID found. Event will not be tracked.');
      return false;
    }

    // Collect context data from the external website
    var viewport = getViewportDimensions();
    var pageUrl = window.location.href;
    var referrerUrl = document.referrer || null;

    // Prepare event data with additional context
    var eventData = {
      click_id: state.token,
      event_id: eventId,
      event_value: typeof eventValue === 'number' ? eventValue : 0,
      event_value_currency: typeof eventValueCurrency === 'string' ? eventValueCurrency : 'USD',
      event_value_type: (eventValueType === 'static' || eventValueType === 'dynamic') ? eventValueType : 'dynamic',
      // Additional context data from external website
      page_url: pageUrl,
      referrer_url: referrerUrl,
      viewport_width: viewport.width,
      viewport_height: viewport.height
    };

    log('Tracking event: ' + eventId + ' with value: ' + eventData.event_value + ' ' + eventData.event_value_currency + ' on page: ' + pageUrl);

    // Send event with retry logic
    retryWithBackoff(
      function(callback) {
        sendEventToAPI(eventData, callback);
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_DELAY,
      function(error, success) {
        if (!success) {
          log('Failed to track event after retries: ' + eventId);
        }
      }
    );

    return true;
  }

  // Initialize the tracking system
  function init() {
    if (state.initialized) {
      return;
    }

    log('Initializing Firebuzz tracking...');

    // Extract tracking token from URL
    state.token = getUrlParameter(CONFIG.TOKEN_PARAM);

    if (state.token) {
      log('Firebuzz click ID found and stored');
    } else {
      log('Warning: No Firebuzz click ID found in URL parameters');
    }

    state.initialized = true;

    // Process any queued events
    while (state.eventQueue.length > 0) {
      var queuedEvent = state.eventQueue.shift();
      processEvent(
        queuedEvent.eventId,
        queuedEvent.eventValue,
        queuedEvent.eventValueCurrency,
        queuedEvent.eventValueType
      );
    }

    log('Initialization complete');
  }

  // Global tracking method
  function frbzztrack(eventId, eventValue, eventValueCurrency, eventValueType) {
    if (!state.initialized) {
      // Queue the event if not initialized yet
      state.eventQueue.push({
        eventId: eventId,
        eventValue: eventValue,
        eventValueCurrency: eventValueCurrency,
        eventValueType: eventValueType
      });

      log('Event queued until initialization: ' + eventId);
      return;
    }

    return processEvent(eventId, eventValue, eventValueCurrency, eventValueType);
  }

  // Expose global method
  if (typeof window !== 'undefined') {
    window[CONFIG.GLOBAL_METHOD] = frbzztrack;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      // DOM is already ready
      setTimeout(init, 0);
    }
  }

  log('Firebuzz tracking script loaded');
})();`;

		return new Response(trackingScript, {
			status: 200,
			headers: {
				"Content-Type": getContentType("js"),
				"Cache-Control": "public, max-age=3600", // Cache for 1 hour
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		});
	} catch (error) {
		console.error("Error serving tracking script", error);
		return c.json(
			{
				success: false,
				error: "Failed to serve tracking script",
			},
			500,
		);
	}
});

export { app as trackScriptRoute };

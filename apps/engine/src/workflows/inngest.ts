import { Inngest } from "inngest";
import { bindings } from "./middleware";

export const inngest = new Inngest({
	id: "my-app",
	baseUrl: "https://inngestinngest-production-9f5a.up.railway.app",
	middleware: [bindings],
});

// This function will be invoked by Inngest via HTTP any time
// the "app/user.signup" event is sent to to Inngest
const testFunction = inngest.createFunction(
	{ id: "test-function" },
	{ event: "test/event" },
	async ({ event, step }) => {
		const eventData = event.data;
		await step.run("Send welcome email", async () => {
			console.log(eventData.message);
		});
	},
);

const testFunction2 = inngest.createFunction(
	{ id: "test-function-2" },
	{ event: "test/event-2" },
	async ({ event, step }) => {
		const count = event.data.count ?? 100;
		const events = Array.from({ length: count }, (_, i) => ({
			name: "test/event",
			data: {
				message: `Hello from test function 2 ${i}`,
			},
		}));
		await step.sendEvent("test/event-3", events);
	},
);

export const functions = [testFunction, testFunction2];

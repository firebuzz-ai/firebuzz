import "./style.css";

// State
let isDesignModeActive = false;
let selectedElement: any = null;

// Get DOM elements
const toggleBtn = document.getElementById(
	"toggleDesignMode",
) as HTMLButtonElement;
const elementEditor = document.getElementById("elementEditor") as HTMLDivElement;
const tagNameSpan = document.getElementById("tagName") as HTMLSpanElement;
const sourceInfoSpan = document.getElementById("sourceInfo") as HTMLSpanElement;
const classNameTextarea = document.getElementById(
	"className",
) as HTMLTextAreaElement;
const textContentTextarea = document.getElementById(
	"textContent",
) as HTMLTextAreaElement;
const srcInput = document.getElementById("src") as HTMLInputElement;
const altInput = document.getElementById("alt") as HTMLInputElement;
const srcGroup = document.getElementById("srcGroup") as HTMLDivElement;
const altGroup = document.getElementById("altGroup") as HTMLDivElement;
const applyChangesBtn = document.getElementById(
	"applyChanges",
) as HTMLButtonElement;
const debugLog = document.getElementById("debugLog") as HTMLDivElement;
const previewFrame = document.getElementById(
	"previewFrame",
) as HTMLIFrameElement;

// Debug logger
function log(message: string, data?: any) {
	const timestamp = new Date().toLocaleTimeString();
	const logEntry = document.createElement("div");
	logEntry.className = "log-entry";
	logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
	if (data) {
		logEntry.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
	}
	debugLog.appendChild(logEntry);
	debugLog.scrollTop = debugLog.scrollHeight;
	console.log(`[Test Harness] ${message}`, data || "");
}

// Toggle design mode
toggleBtn.addEventListener("click", () => {
	isDesignModeActive = !isDesignModeActive;
	toggleBtn.textContent = isDesignModeActive
		? "Disable Design Mode"
		: "Enable Design Mode";
	toggleBtn.className = isDesignModeActive
		? "btn btn-danger"
		: "btn btn-primary";

	// Send message to iframe
	if (previewFrame.contentWindow) {
		previewFrame.contentWindow.postMessage(
			{
				type: isDesignModeActive ? "ENABLE_DESIGN_MODE" : "DISABLE_DESIGN_MODE",
				enabled: isDesignModeActive,
			},
			"*",
		);
		log(
			isDesignModeActive
				? "Design mode ENABLED"
				: "Design mode DISABLED",
		);
	}
});

// Listen for messages from iframe
window.addEventListener("message", (event) => {
	if (event.data.type === "FB_ELEMENT_SELECTED" && event.data.data) {
		selectedElement = event.data.data;
		log("Element selected from iframe", selectedElement);

		// Show element editor
		elementEditor.classList.remove("hidden");

		// Update UI
		tagNameSpan.textContent = selectedElement.tagName;
		sourceInfoSpan.textContent = `${selectedElement.sourceFile}:${selectedElement.sourceLine}:${selectedElement.sourceColumn}`;
		classNameTextarea.value = selectedElement.className || "";
		textContentTextarea.value = selectedElement.textContent || "";

		// Show/hide image fields based on element type
		const isImage = selectedElement.tagName === "IMG";
		srcGroup.style.display = isImage ? "block" : "none";
		altGroup.style.display = isImage ? "block" : "none";

		if (isImage) {
			srcInput.value = selectedElement.src || "";
			altInput.value = selectedElement.alt || "";
		}
	}
});

// Apply changes
applyChangesBtn.addEventListener("click", () => {
	if (!selectedElement || !previewFrame.contentWindow) return;

	const updates: any = {};

	if (classNameTextarea.value !== selectedElement.className) {
		updates.className = classNameTextarea.value;
	}

	if (textContentTextarea.value !== (selectedElement.textContent || "")) {
		updates.textContent = textContentTextarea.value;
	}

	if (selectedElement.tagName === "IMG") {
		if (srcInput.value !== (selectedElement.src || "")) {
			updates.src = srcInput.value;
		}
		if (altInput.value !== (selectedElement.alt || "")) {
			updates.alt = altInput.value;
		}
	}

	if (Object.keys(updates).length === 0) {
		log("No changes to apply");
		return;
	}

	log("Applying updates", updates);

	// Send update message to iframe
	previewFrame.contentWindow.postMessage(
		{
			type: "FB_UPDATE_ELEMENT",
			sourceFile: selectedElement.sourceFile,
			sourceLine: selectedElement.sourceLine,
			sourceColumn: selectedElement.sourceColumn,
			updates,
		},
		"*",
	);

	// Update local state
	selectedElement = {
		...selectedElement,
		...updates,
	};
});

// Real-time updates (optional - for instant feedback)
classNameTextarea.addEventListener("input", () => {
	if (!selectedElement || !previewFrame.contentWindow) return;

	log("Real-time class update", { className: classNameTextarea.value });

	previewFrame.contentWindow.postMessage(
		{
			type: "FB_UPDATE_ELEMENT",
			sourceFile: selectedElement.sourceFile,
			sourceLine: selectedElement.sourceLine,
			sourceColumn: selectedElement.sourceColumn,
			updates: {
				className: classNameTextarea.value,
			},
		},
		"*",
	);
});

textContentTextarea.addEventListener("input", () => {
	if (!selectedElement || !previewFrame.contentWindow) return;

	log("Real-time text update", { textContent: textContentTextarea.value });

	previewFrame.contentWindow.postMessage(
		{
			type: "FB_UPDATE_ELEMENT",
			sourceFile: selectedElement.sourceFile,
			sourceLine: selectedElement.sourceLine,
			sourceColumn: selectedElement.sourceColumn,
			updates: {
				textContent: textContentTextarea.value,
			},
		},
		"*",
	);
});

srcInput.addEventListener("input", () => {
	if (!selectedElement || !previewFrame.contentWindow || selectedElement.tagName !== "IMG") return;

	log("Real-time src update", { src: srcInput.value });

	previewFrame.contentWindow.postMessage(
		{
			type: "FB_UPDATE_ELEMENT",
			sourceFile: selectedElement.sourceFile,
			sourceLine: selectedElement.sourceLine,
			sourceColumn: selectedElement.sourceColumn,
			updates: {
				src: srcInput.value,
			},
		},
		"*",
	);
});

altInput.addEventListener("input", () => {
	if (!selectedElement || !previewFrame.contentWindow || selectedElement.tagName !== "IMG") return;

	log("Real-time alt update", { alt: altInput.value });

	previewFrame.contentWindow.postMessage(
		{
			type: "FB_UPDATE_ELEMENT",
			sourceFile: selectedElement.sourceFile,
			sourceLine: selectedElement.sourceLine,
			sourceColumn: selectedElement.sourceColumn,
			updates: {
				alt: altInput.value,
			},
		},
		"*",
	);
});

log("Test harness initialized. Waiting for iframe to load...");

// Wait for iframe to load
previewFrame.addEventListener("load", () => {
	log("Preview iframe loaded successfully");
});

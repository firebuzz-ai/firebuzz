import { stripIndents } from "@firebuzz/utils";

export const WORK_DIR_NAME = "firebuzz";
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;

// TODO: Delete logs etc.
export const PREVIEW_SCRIPT = stripIndents(`
          // Log when the script starts executing
          console.time('iframe-total-load-time');
          const startTime = performance.now();
          
          window.parent.postMessage({ type: 'load-started', time: startTime }, '*');
          
          // Track if element selection is enabled
          let isElementSelectionEnabled = false;
          
          // Listen for messages from parent to enable/disable element selection
          window.addEventListener('message', (event) => {
            if (event.data.type === 'set-element-selection') {
              isElementSelectionEnabled = event.data.enabled;
              console.log('Element selection ' + (isElementSelectionEnabled ? 'enabled' : 'disabled'));
              
              // Update UI feedback for selection mode
              if (isElementSelectionEnabled) {
                document.body.style.cursor = 'pointer';
              } else {
                document.body.style.cursor = '';
                // Remove any active highlight
                const highlighted = document.querySelector('.wc-hover-highlight');
                if (highlighted) {
                  highlighted.classList.remove('wc-hover-highlight');
                }
              }
            }
          });
  
          window.addEventListener('load', () => {
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            console.timeEnd('iframe-total-load-time');
            window.parent.postMessage({ 
              type: 'iframe-loaded',
              loadTime: loadTime 
            }, '*');
            
            // Add hover highlight effect
            const style = document.createElement('style');
            style.textContent = \`
              .wc-hover-highlight {
                outline: 2px solid #3b82f6 !important;
                outline-offset: 2px !important;
              }
            \`;
            document.head.appendChild(style);
  
            let currentHighlight = null;
  
            // Handle mouseover - only when element selection is enabled
            document.body.addEventListener('mouseover', (e) => {
              if (!isElementSelectionEnabled) return;
              
              const target = e.target;
              if (currentHighlight) {
                currentHighlight.classList.remove('wc-hover-highlight');
              }
              target.classList.add('wc-hover-highlight');
              currentHighlight = target;
            });
  
            // Handle mouseout
            document.body.addEventListener('mouseout', (e) => {
              if (!isElementSelectionEnabled) return;
              
              if (currentHighlight) {
                currentHighlight.classList.remove('wc-hover-highlight');
                currentHighlight = null;
              }
            });
  
            // Handle click - Updated to handle UI components specially
            document.body.addEventListener('click', (e) => {
              if (!isElementSelectionEnabled) return;
              
              e.preventDefault();
              const target = e.target;

              // Find React fiber
              const fiberKey = Object.keys(target).find(key => 
                key.startsWith('__reactFiber$') || 
                key.startsWith('__reactInternalInstance$')
              );

              if (!fiberKey) return;

              let fiber = target[fiberKey];
              let components = [];

              // Collect components in the fiber tree
              while (fiber) {
                const isComponent = fiber.tag === 0 || fiber.tag === 1;
                const isElement = fiber.tag === 5;
                
                if (isComponent || isElement) {
                  const componentName = isComponent 
                    ? (fiber.type?.name || 'Anonymous')
                    : fiber.type;

                  if (componentName !== 'Fragment' && 
                      !componentName.includes('Provider') && 
                      componentName !== 'Anonymous') {
                    
                    if (fiber._debugSource) {
                      // Include props and children to help identify specific elements
                      components.push({
                        name: componentName,
                        source: fiber._debugSource,
                        props: fiber.memoizedProps,
                        // Get the text content for buttons
                        text: fiber.memoizedProps?.children?.toString() || ''
                      });
                    }
                  }
                }
                fiber = fiber.return;
              }

              if (!components.length) return;

              try {
                // Get the most specific component (first in the tree)
                const clickedElement = components[0];
                
                // Find the parent component if clicked element is from UI folder
                const isUIComponent = clickedElement.source?.fileName?.includes('/components/ui/') || false;
                const parentComponent = isUIComponent && components.length > 1 ? components[1] : clickedElement;
                
                // Safely get file path - handling multiple possible path patterns
                let filePath = '';
                if (parentComponent.source?.fileName) {
                  // Try several common path patterns
                  const pathPatterns = [
                    '/workspace/1/src/',
                    '/src/',
                    '/app/',
                    '/components/'
                  ];
                  
                  const fileName = parentComponent.source.fileName.replace(/\\\\/g, '/');
                  
                  // Find the first pattern that works
                  for (const pattern of pathPatterns) {
                    if (fileName.includes(pattern)) {
                      const parts = fileName.split(pattern);
                      if (parts.length > 1) {
                        filePath = parts[1];
                        break;
                      }
                    }
                  }
                  
                  // If no pattern matched, use the full path as fallback
                  if (!filePath) {
                    filePath = fileName;
                  }
                }

                // Safe text extraction
                const elementText = typeof clickedElement.text === 'string' 
                  ? clickedElement.text.trim() 
                  : '';
                
                const componentInfo = {
                  filePath,
                  componentName: \`\${clickedElement.name || 'Unknown'}\${elementText ? \` (\${elementText})\` : ''}\`,
                  lineNumber: parentComponent.source?.lineNumber || 0
                };

                window.parent.postMessage({
                  type: 'element-selected',
                  data: componentInfo
                }, '*');
              } catch (error) {
                console.error('Error processing component selection:', error);
                // Send error info to parent for debugging
                window.parent.postMessage({
                  type: 'element-selection-error',
                  error: error.message
                }, '*');
              }
            }, true);
          });
        `);

export const ARTIFACT_TAG_OPEN = "<firebuzzArtifact";
export const ARTIFACT_TAG_CLOSE = "</firebuzzArtifact>";
export const ARTIFACT_ACTION_TAG_OPEN = "<firebuzzAction";
export const ARTIFACT_ACTION_TAG_CLOSE = "</firebuzzAction>";

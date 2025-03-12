import { stripIndents } from "@firebuzz/utils";

export const WORK_DIR_NAME = "firebuzz";
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;

// TODO: Delete logs etc.
export const PREVIEW_SCRIPT = stripIndents(`
          // Log when the script starts executing
          console.time('iframe-total-load-time');
          const startTime = performance.now();
          window.parent.postMessage({ type: 'load-started', time: startTime }, '*');
  
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
  
            // Handle mouseover
            document.body.addEventListener('mouseover', (e) => {
              const target = e.target;
              if (currentHighlight) {
                currentHighlight.classList.remove('wc-hover-highlight');
              }
              target.classList.add('wc-hover-highlight');
              currentHighlight = target;
            });
  
            // Handle mouseout
            document.body.addEventListener('mouseout', (e) => {
              if (currentHighlight) {
                currentHighlight.classList.remove('wc-hover-highlight');
                currentHighlight = null;
              }
            });
  
            // Handle click - Updated to handle UI components specially
            document.body.addEventListener('click', (e) => {
              e.preventDefault();
              const target = e.target;

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

              // Get the most specific component (first in the tree)
              const clickedElement = components[0];
              
              // Find the parent component if clicked element is from UI folder
              const isUIComponent = clickedElement.source.fileName.includes('/components/ui/');
              const parentComponent = isUIComponent ? components[1] : clickedElement;

              // Format the file path to be relative
              const filePath = parentComponent.source.fileName
                .split('/workspace/1/src/')[1] // Get relative path
                .replace(/\\\\/g, '/'); // Normalize slashes

              const componentInfo = {
                filePath,
                componentName: \`\${clickedElement.name}\${clickedElement.text ? \` (\${clickedElement.text})\` : ''}\`,
                lineNumber: parentComponent.source.lineNumber
              };

              window.parent.postMessage({
                type: 'element-selected',
                data: componentInfo
              }, '*');
            }, true);
          });
        `);

export const ARTIFACT_TAG_OPEN = "<firebuzzArtifact";
export const ARTIFACT_TAG_CLOSE = "</firebuzzArtifact>";
export const ARTIFACT_ACTION_TAG_OPEN = "<firebuzzAction";
export const ARTIFACT_ACTION_TAG_CLOSE = "</firebuzzAction>";

import type { SelectedElement } from "@/lib/workbench/atoms";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@firebuzz/ui/components/ui/accordion";
import { Code } from "@firebuzz/ui/icons/lucide";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface ElementReferenceProps {
  message: string;
  element: SelectedElement;
}

export const ElementReference = ({
  message,
  element,
}: ElementReferenceProps) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!element) {
    return <p>{message}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap">{message}</p>

      <div className="border rounded-md overflow-hidden w-full">
        <div className="flex items-stretch">
          <button
            type="button"
            className="flex-1 justify-start px-4 py-2 h-auto hover:bg-accent rounded-none text-left"
            onClick={() => setIsVisible(!isVisible)}
          >
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium text-sm">Referenced Component</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Click to {isVisible ? "hide" : "show"} component details
                </div>
              </div>
            </div>
          </button>
        </div>

        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="h-px bg-border" />
              <div className="p-4 bg-muted/50">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full"
                    defaultValue="component-details"
                  >
                    <AccordionItem
                      value="component-details"
                      className="border-none"
                    >
                      <AccordionTrigger className="py-2 text-sm font-medium hover:bg-muted/70 px-2 rounded-none">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-primary" />
                          {element.componentName}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 px-2">
                        <div className="space-y-3">
                          <div className="text-sm">
                            <p className="font-medium">File location:</p>
                            <p className="text-muted-foreground">
                              {element.filePath}:{element.lineNumber}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

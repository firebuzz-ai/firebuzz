import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@firebuzz/ui/components/ui/accordion";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Bug } from "@firebuzz/ui/icons/lucide";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface ErrorData {
  errorType: string;
  errorExplanation: string;
  hint: string;
}

interface ErrorExplanationProps {
  errors: ErrorData[];
}

export const ErrorExplanation = ({ errors }: ErrorExplanationProps) => {
  const [isErrorsVisible, setIsErrorsVisible] = useState(false);

  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-md overflow-hidden w-full">
      <div className="flex items-stretch">
        <Button
          variant="ghost"
          className="flex-1 justify-start px-4 py-2 h-auto hover:bg-accent rounded-none"
          onClick={() => setIsErrorsVisible(!isErrorsVisible)}
        >
          <div className="flex items-center gap-2 text-left">
            <div>
              <div className="font-medium text-sm">Possible fixes found</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Click to {isErrorsVisible ? "close" : "open"} error details
              </div>
            </div>
          </div>
        </Button>
      </div>

      <AnimatePresence>
        {isErrorsVisible && (
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
                <Accordion type="single" collapsible className="w-full">
                  {errors.map((error, index) => (
                    <motion.div
                      key={`error-${error.errorType}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <AccordionItem
                        value={`error-${error.errorType}-${index}`}
                        className="border-b-0 last:border-0"
                      >
                        <AccordionTrigger className="py-2 text-sm font-medium hover:bg-muted/70 px-2 rounded-none">
                          <div className="flex items-center gap-2">
                            <Bug className="h-4 w-4 text-red-400" />
                            {error.errorType}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3 px-2">
                          <div className="space-y-3">
                            <div className="text-sm">
                              {error.errorExplanation}
                            </div>
                            <div className="bg-background border p-3 rounded-md">
                              <p className="text-xs font-medium mb-1">Hint:</p>
                              <p className="text-sm text-muted-foreground">
                                {error.hint}
                              </p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

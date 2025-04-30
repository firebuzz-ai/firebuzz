import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { GenerateForm } from "./generate-form";
import { GeneratingAnimation } from "./generating-animation";

export type GenerateImageState = "idle" | "generating";

export const GenerateImage = () => {
  const [state, setState] = useState<GenerateImageState>("idle");

  // Main UI
  return (
    <div className="flex flex-col w-full h-full col-span-9">
      <AnimatePresence>
        {state === "generating" && <GeneratingAnimation />}
        {state === "idle" && <GenerateForm setState={setState} />}
      </AnimatePresence>
    </div>
  );
};

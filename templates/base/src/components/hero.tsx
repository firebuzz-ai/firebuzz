import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

export function Hero() {
  return (
    <motion.header
      className="container px-4 py-16 mx-auto text-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-6xl font-bold tracking-tight">
        Transform Your Workflow
        <span className="text-primary"> With Our SaaS</span>
      </h1>
      <p className="max-w-2xl mx-auto mt-6 text-xl text-muted-foreground">
        Streamline your business operations with our powerful platform. Get
        started in minutes.
      </p>
      <div className="flex justify-center gap-4 mt-10">
        <Button size="lg">Get Started</Button>
        <Button size="lg" variant="outline">
          Learn More
        </Button>
      </div>
    </motion.header>
  );
}

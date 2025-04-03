import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

export function CTA() {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <motion.section
      className="container px-4 py-20 mx-auto text-center"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
    >
      <motion.h2 className="mb-6 text-3xl font-bold" variants={itemVariants}>
        Ready to Get Started?
      </motion.h2>
      <motion.p
        className="max-w-2xl mx-auto mb-8 text-xl text-muted-foreground"
        variants={itemVariants}
      >
        Join thousands of satisfied customers who have transformed their
        business with our platform.
      </motion.p>
      <motion.div variants={itemVariants}>
        <Button size="lg" className="px-8">
          Start Your Free Trial
        </Button>
      </motion.div>
    </motion.section>
  );
}

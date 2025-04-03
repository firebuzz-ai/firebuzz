import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "motion/react";

export function Features() {
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
    <div className="px-4 py-20 bg-muted/50">
      <motion.section
        className="container mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <motion.h2
          className="mb-12 text-3xl font-bold text-center"
          variants={itemVariants}
        >
          Why Choose Us
        </motion.h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Easy Integration",
              description: "Connect with your favorite tools seamlessly",
            },
            {
              title: "Real-time Analytics",
              description: "Get insights instantly with powerful dashboards",
            },
            {
              title: "24/7 Support",
              description: "Our team is here to help you succeed",
            },
          ].map((feature, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <motion.div key={index} variants={itemVariants}>
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

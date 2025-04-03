import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "motion/react";

export function Pricing() {
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
      className="container px-4 py-20 mx-auto"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
    >
      <motion.h2
        className="mb-12 text-3xl font-bold text-center"
        variants={itemVariants}
      >
        Simple, Transparent Pricing
      </motion.h2>
      <div className="grid gap-8 md:grid-cols-3">
        {[
          {
            title: "Starter",
            price: "$9",
            description: "Perfect for small teams",
            features: ["Up to 5 users", "Basic features", "Email support"],
          },
          {
            title: "Pro",
            price: "$29",
            description: "Best for growing businesses",
            features: [
              "Up to 20 users",
              "Advanced features",
              "Priority support",
            ],
          },
          {
            title: "Enterprise",
            price: "Custom",
            description: "For large organizations",
            features: ["Unlimited users", "Custom features", "24/7 support"],
          },
        ].map((plan) => (
          <motion.div
            key={plan.title}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="border shadow-lg">
              <CardHeader>
                <CardTitle>{plan.title}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{plan.price}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    <li key={i} className="flex items-center">
                      <span className="mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Get Started</Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

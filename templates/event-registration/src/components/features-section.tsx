import {
  BarChart3,
  Headphones,
  Link,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

export function FeaturesSection() {
  const features = [
    {
      title: "Advanced Analytics",
      description:
        "Get detailed insights into your performance with real-time analytics and reporting.",
      icon: BarChart3,
    },
    {
      title: "Automated Workflows",
      description:
        "Set up automated processes that handle repetitive tasks and improve efficiency.",
      icon: RefreshCw,
    },
    {
      title: "Team Collaboration",
      description:
        "Work together seamlessly with built-in collaboration tools and shared workspaces.",
      icon: Users,
    },
    {
      title: "Custom Integrations",
      description:
        "Connect with your favorite tools through our extensive API and integrations.",
      icon: Link,
    },
    {
      title: "Enterprise Security",
      description:
        "Bank-level security with encryption, compliance, and access controls.",
      icon: Shield,
    },
    {
      title: "24/7 Support",
      description:
        "Get help whenever you need it with our dedicated support team.",
      icon: Headphones,
    },
  ];

  return (
    <section id="features" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-6">
            Powerful Features for Better Results
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to succeed, all in one comprehensive platform.
            Our features are designed to work together seamlessly.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={index}
                className="bg-card p-8 rounded-lg border hover:shadow-lg transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <p className="text-muted-foreground mb-6">
            And many more features to help you achieve your goals
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full">
              API Access
            </span>
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full">
              Mobile Apps
            </span>
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full">
              White Label
            </span>
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full">
              Custom Reports
            </span>
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full">
              Data Export
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

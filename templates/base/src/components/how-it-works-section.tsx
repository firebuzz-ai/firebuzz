import { motion } from "motion/react";

export function HowItWorksSection() {
  const steps = [
    {
      step: "1",
      title: "Sign Up & Setup",
      description:
        "Create your account and complete the quick setup process. We'll guide you through connecting your existing tools and data sources.",
    },
    {
      step: "2",
      title: "Configure & Customize",
      description:
        "Set up your workflows, customize the interface, and configure settings to match your specific needs and preferences.",
    },
    {
      step: "3",
      title: "Start Using & Optimizing",
      description:
        "Begin using the platform immediately. Our AI will learn from your usage patterns and continuously optimize your experience.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-6">How It Works</h2>
          <p className="text-xl text-muted-foreground">
            Getting started is simple. Follow these three easy steps to
            transform your workflow and start seeing results immediately.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <div
                className={`flex items-center gap-8 mb-16 ${index % 2 === 1 ? "flex-row-reverse" : ""}`}
              >
                <div className="flex-1">
                  <div className="bg-card p-8 rounded-lg border">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mr-4">
                        {step.step}
                      </div>
                      <h3 className="text-2xl font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-lg">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="bg-muted rounded-lg p-8 h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-primary">
                          {step.step}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        Step {step.step} Visual
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-border -bottom-8 z-10" />
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="bg-primary/10 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold mb-4">
              Ready to get started?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of satisfied users who have transformed their
              workflow. Start your free trial today and see the difference in
              minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Start Free Trial
              </button>
              <button className="px-8 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors">
                Schedule Demo
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

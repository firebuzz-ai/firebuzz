import { motion } from "motion/react";

export function ProblemSection() {
  const problems = [
    {
      title: "Time-Consuming Process",
      description:
        "Current solutions take too much time and effort to implement effectively.",
    },
    {
      title: "Lack of Integration",
      description:
        "Existing tools don't work well together, creating workflow inefficiencies.",
    },
    {
      title: "High Costs",
      description:
        "Traditional approaches are expensive and don't deliver proportional value.",
    },
    {
      title: "Poor User Experience",
      description:
        "Complex interfaces make it difficult for teams to adopt and use consistently.",
    },
  ];

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-6">
            The Problems You're Facing
          </h2>
          <p className="text-xl text-muted-foreground">
            We understand the challenges that prevent you from achieving your
            goals. These common pain points are exactly what our solution
            addresses.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              className="bg-card p-8 rounded-lg border"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg
                    className="w-4 h-4 text-destructive"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">
                    {problem.title}
                  </h3>
                  <p className="text-muted-foreground">{problem.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

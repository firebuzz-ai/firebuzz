import { motion } from "motion/react";
import { useState } from "react";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does the free trial work?",
      answer:
        "You get full access to all features for 30 days, no credit card required. You can upgrade to a paid plan anytime during or after the trial period.",
    },
    {
      question: "Can I change my plan later?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and you'll be charged or refunded on a prorated basis.",
    },
    {
      question: "What integrations are available?",
      answer:
        "We integrate with over 100+ popular tools including Slack, Google Workspace, Microsoft 365, Salesforce, HubSpot, and many more. We also provide a robust API for custom integrations.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely. We use enterprise-grade security with 256-bit encryption, SOC 2 Type II compliance, and regular security audits. Your data is backed up daily across multiple secure data centers.",
    },
    {
      question: "Do you offer customer support?",
      answer:
        "Yes, we provide email support for all plans, priority support for Professional plans, and 24/7 phone support for Enterprise customers. Our average response time is under 4 hours.",
    },
    {
      question: "Can I export my data?",
      answer:
        "Yes, you can export your data at any time in various formats including CSV, PDF, and JSON. We believe in data portability and will never lock you in.",
    },
    {
      question: "What happens if I cancel?",
      answer:
        "You can cancel anytime with no penalties. Your account remains active until the end of your billing period, and you can export all your data before cancellation.",
    },
    {
      question: "Do you offer discounts for nonprofits or students?",
      answer:
        "Yes, we offer 50% discounts for qualified nonprofits and educational institutions. Contact our sales team for more information about our special pricing programs.",
    },
  ];

  return (
    <section id="faq" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Got questions? We've got answers. If you can't find what you're
            looking for, don't hesitate to reach out to our support team.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full bg-card p-6 rounded-lg border text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold pr-4">{faq.question}</h3>
                  <svg
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {openIndex === index && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Contact Support */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="bg-primary/10 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold mb-4">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              Our support team is here to help. Get in touch and we'll respond
              within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Contact Support
              </button>
              <button className="px-8 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors">
                Schedule Call
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

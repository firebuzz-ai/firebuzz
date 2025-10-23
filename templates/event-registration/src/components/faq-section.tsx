import { motion } from "motion/react";
import { useState } from "react";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What is included in the registration fee?",
      answer:
        "Your registration includes full access to both days of the event, all keynote sessions, workshops, networking events, breakfast and lunch on both days, event materials, and a certificate of attendance.",
    },
    {
      question: "Where is the event located?",
      answer:
        "The event will be held at the San Francisco Convention Center, 747 Howard Street, San Francisco, CA 94103. The venue is easily accessible via public transportation and has ample parking available.",
    },
    {
      question: "Can I get a refund if I can't attend?",
      answer:
        "Yes, we offer full refunds up to 30 days before the event. Within 30 days, you can transfer your ticket to a colleague or receive a 50% refund. No refunds are available within 7 days of the event.",
    },
    {
      question: "Will sessions be recorded?",
      answer:
        "Yes, all keynote sessions and select workshops will be recorded. Registered attendees will receive access to recordings within 48 hours after the event concludes.",
    },
    {
      question: "Is there a dress code?",
      answer:
        "Business casual attire is recommended. The venue is climate-controlled, and we suggest comfortable shoes as there will be opportunities to network and move between sessions.",
    },
    {
      question: "Are meals provided?",
      answer:
        "Yes, continental breakfast and a full lunch are included on both days. We accommodate dietary restrictions—please indicate any requirements during registration.",
    },
    {
      question: "Can I attend virtually?",
      answer:
        "This is an in-person only event. However, all registered attendees will receive access to session recordings and materials after the event.",
    },
    {
      question: "How can I become a speaker or sponsor?",
      answer:
        "For speaking opportunities, please visit our website and submit a proposal. For sponsorship inquiries, contact our partnerships team at sponsors@event.com or download our sponsorship package.",
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
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Got questions about the event? Find answers to common questions below.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={`faq-${index}`}
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
              Our event team is here to help. Contact us and we'll respond
              within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Contact Event Team
              </button>
              <button className="px-8 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors">
                Email Us
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

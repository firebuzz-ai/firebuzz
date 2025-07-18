import { motion } from "motion/react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "TechCorp",
      content:
        "This platform completely transformed how we manage our marketing campaigns. The automation features saved us 20+ hours per week.",
      rating: 5,
      avatar: "/avatars/sarah-johnson.jpg",
    },
    {
      name: "Michael Chen",
      role: "CEO",
      company: "StartupXYZ",
      content:
        "The ROI was immediate. Within the first month, we saw a 40% increase in efficiency and our team productivity skyrocketed.",
      rating: 5,
      avatar: "/avatars/michael-chen.jpg",
    },
    {
      name: "Emily Rodriguez",
      role: "Operations Manager",
      company: "GlobalInc",
      content:
        "Finally, a solution that actually works as promised. The integration with our existing tools was seamless and the support team is amazing.",
      rating: 5,
      avatar: "/avatars/emily-rodriguez.jpg",
    },
    {
      name: "David Thompson",
      role: "Product Manager",
      company: "InnovateHub",
      content:
        "The analytics insights alone are worth the price. We've made data-driven decisions that resulted in 30% better outcomes.",
      rating: 5,
      avatar: "/avatars/david-thompson.jpg",
    },
    {
      name: "Lisa Wang",
      role: "CTO",
      company: "DevCorp",
      content:
        "Security and reliability are top-notch. Our team can focus on what matters most while this platform handles the rest.",
      rating: 5,
      avatar: "/avatars/lisa-wang.jpg",
    },
    {
      name: "James Wilson",
      role: "Consultant",
      company: "BusinessPro",
      content:
        "I've recommended this to all my clients. The time savings and improved results speak for themselves.",
      rating: 5,
      avatar: "/avatars/james-wilson.jpg",
    },
  ];

  const stats = [
    { value: "10K+", label: "Happy Customers" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
    { value: "50+", label: "Countries" },
  ];

  return (
    <section id="testimonials" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-6">
            Trusted by Thousands of Users
          </h2>
          <p className="text-xl text-muted-foreground">
            See what our customers are saying about their experience with our
            platform. These results speak for themselves.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-card p-6 rounded-lg border"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              {/* Rating */}
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Content */}
              <p className="text-muted-foreground mb-6 italic">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                  <span className="text-primary font-semibold">
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="bg-primary/10 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold mb-4">
              Join thousands of satisfied users
            </h3>
            <p className="text-muted-foreground mb-6">
              Start your free trial today and see why so many companies trust us
              with their success.
            </p>
            <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Start Free Trial
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

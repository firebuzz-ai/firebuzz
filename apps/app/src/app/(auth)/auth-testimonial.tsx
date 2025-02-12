"use client";
import { AnimatePresence, motion } from "motion/react";

const SlideIn = {
  opacity: 1,
  y: 0,
};

const SlideOut = {
  opacity: 0,
  y: -20,
};

const variants = {
  initial: SlideOut,
  animate: SlideIn,
  exit: SlideOut,
};
// TODO: Export these testimonails from shared config
const TESTIMONIALS = [
  {
    id: 1,
    text: "I don’t know how I would build my product without Firebuzz. It’s very well documented, easy to start and most importantly ready to scale.",
    fullName: "Batuhan Bilgin",
    title: "Founder @makrdev",
  },
  {
    id: 2,
    text: "Firebuzz is the best tool for developers. It’s easy to use and has a lot of features. I can’t wait to see what they come up with next.",
    fullName: "Sara Smith",
    title: "Developer @acme",
  },
  {
    id: 3,
    text: "I’ve been using Firebuzz for a while now and it’s been great. The documentation is easy to follow and the support team is very helpful.",
    fullName: "John Doe",
    title: "CTO @company",
  },
];

const TestimonialSection = () => {
  // Pick a random testimonial
  const randomTestimonial =
    TESTIMONIALS[Math.floor(Math.random() * TESTIMONIALS.length)];

  return (
    <div
      suppressHydrationWarning
      className="md:flex hidden flex-1 items-center justify-center bg-muted border-l border-border px-6"
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          suppressHydrationWarning
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          key={randomTestimonial.id}
          className="pl-8 border-l-2 border-border max-w-xl space-y-4 py-3 relative"
        >
          <h2 className="text-lg font-medium" suppressHydrationWarning>
            {randomTestimonial.text}
          </h2>
          <div
            suppressHydrationWarning
            className="flex items-center gap-2 text-sm"
          >
            <div suppressHydrationWarning>{randomTestimonial.fullName}</div>
          </div>
          <div className="absolute w-[2px] transform bg-primary h-[40%] -left-[2px] top-5" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TestimonialSection;

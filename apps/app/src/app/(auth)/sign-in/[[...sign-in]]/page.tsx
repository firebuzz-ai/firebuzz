import { Icon } from "@firebuzz/ui/components/brand/icon";
import Footer from "../../auth-footer";
import TestimonialSection from "../../auth-testimonial";
import SignIn from "../signin";

const Page = () => {
  return (
    <>
      {/* Left Container */}
      <div className="flex-1 p-8 flex flex-col gap-20 justify-between md:max-w-xl">
        {/* Logo */}
        <div className="p-2 rounded-lg bg-muted border border-border max-w-fit">
          <Icon className="w-5" />
        </div>

        <SignIn />
        <Footer />
      </div>
      {/* Right Container */}
      <TestimonialSection />
    </>
  );
};

export default Page;

import Link from "next/link";

const Footer = () => {
  return (
    <div className="text-sm text-muted-foreground">
      By continuing, you agree to Firebuzz’s{" "}
      <Link className="text-link" href="/terms-of-service">
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link className="text-link" href="/privacy-policy">
        Privacy Policy
      </Link>
      , and to receive periodic emails with updates.
    </div>
  );
};

export default Footer;

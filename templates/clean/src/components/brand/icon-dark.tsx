import { Image } from "@/components/ui/image";

interface IconDarkProps {
  size?: number;
}

export function IconDark({ size = 32 }: IconDarkProps) {
  const src = "https://cdn-dev.getfirebuzz.com/template-assets/icon-light.svg";
  const alt = "Icon";

  return <Image src={src} alt={alt} width={size} height={size} priority />;
}

import { Image } from "@/components/ui/image";

interface IconLightProps {
  size?: number;
}

export function IconLight({ size = 32 }: IconLightProps) {
  const src = "https://cdn-dev.getfirebuzz.com/template-assets/icon-light.svg";
  const alt = "Icon";

  return <Image src={src} alt={alt} width={size} height={size} priority />;
}

import { Image } from "@/components/ui/image";

interface LogoLightProps {
  width?: number;
  height?: number;
}

export function LogoLight({ height = 20, width = 70 }: LogoLightProps) {
  const src = "https://cdn-dev.getfirebuzz.com/template-assets/logo-light.svg";
  const alt = "Logo";

  return <Image src={src} alt={alt} width={width} height={height} priority />;
}

import { Image } from "@/components/ui/image";

interface LogoDarkProps {
  width?: number;
  height?: number;
}

export function LogoDark({ width = 70, height = 20 }: LogoDarkProps) {
  const src = "https://cdn-dev.getfirebuzz.com/template-assets/logo-dark.svg";
  const alt = "Logo";
  return <Image src={src} alt={alt} width={width} height={height} />;
}

import { X } from "@firebuzz/ui/icons/lucide";
import Image from "next/image";

export const ImagePreview = ({
  src,
  handleDeselect,
}: {
  src: string;
  handleDeselect: () => void;
}) => {
  return (
    <div className="relative w-full h-40 group">
      <Image
        unoptimized
        src={src}
        alt="Selected content"
        fill
        className="object-contain w-full h-full border rounded-md"
      />
      <button
        type="button"
        onClick={handleDeselect}
        className="absolute p-1 transition-opacity rounded-full shadow-sm opacity-0 top-2 right-2 bg-background/80 text-foreground hover:bg-background group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

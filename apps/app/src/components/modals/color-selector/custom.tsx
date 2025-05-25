import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { useCallback, useState } from "react";
import { HexColorPicker } from "react-colorful";

// Helper function to convert hex to rgba
const hexToRgba = (
  hex: string
): { r: number; g: number; b: number; a: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
        a: 100,
      }
    : { r: 0, g: 0, b: 0, a: 100 };
};

// Helper function to convert rgba to hex
const rgbaToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Validate hex color
const isValidHex = (hex: string): boolean => {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
};

export const CustomColorPicker = () => {
  const { color, setColor } = useColorSelectorModal();

  const [rgba, setRgba] = useState(hexToRgba("#494BCE"));
  const [hexInput, setHexInput] = useState("#494BCE");

  const handleColorChange = useCallback(
    (newColor: string) => {
      setColor(newColor);
      setHexInput(newColor);
      setRgba(hexToRgba(newColor));
    },
    [setColor]
  );

  const handleHexInputChange = (value: string) => {
    setHexInput(value);

    if (isValidHex(value)) {
      const normalizedHex = value.startsWith("#") ? value : `#${value}`;
      setColor(normalizedHex);
      setRgba(hexToRgba(normalizedHex));
    }
  };

  const handleRgbaChange = (component: keyof typeof rgba, value: string) => {
    const numValue = Number.parseInt(value, 10);
    if (Number.isNaN(numValue)) return;

    const newRgba = { ...rgba, [component]: numValue };
    setRgba(newRgba);

    if (component !== "a") {
      const newHex = rgbaToHex(newRgba.r, newRgba.g, newRgba.b);
      setColor(newHex);
      setHexInput(newHex);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-y-auto">
      <div className="flex-1 p-6 space-y-3">
        {/* Color Picker */}
        <div className="flex justify-center">
          <div className="relative w-full ">
            <HexColorPicker
              color={color}
              onChange={handleColorChange}
              className="!w-full !h-48 border"
            />
            <style jsx global>{`
              .react-colorful {
                border-radius: 12px !important;
              }
              .react-colorful__saturation {
                border-radius: 8px 8px 0 0 !important;
              }
              .react-colorful__hue {
                border-radius: 0 0 8px 8px !important;
                height: 24px !important;
              }
              .react-colorful__pointer {
                width: 20px !important;
                height: 20px !important;
                border: 3px solid white !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
              }
            `}</style>
          </div>
        </div>

        {/* Hex Input */}
        <div className="space-y-1">
          <Label htmlFor="hex-input" className="text-sm font-medium">
            HEX
          </Label>
          <Input
            id="hex-input"
            value={hexInput}
            onChange={(e) => handleHexInputChange(e.target.value)}
            placeholder="#000000"
            className="font-mono text-center !h-8 bg-background-subtle"
          />
        </div>

        {/* RGBA Inputs */}
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label htmlFor="r-input" className="text-sm font-medium">
              R
            </Label>
            <Input
              id="r-input"
              type="number"
              min="0"
              max="255"
              value={rgba.r}
              onChange={(e) => handleRgbaChange("r", e.target.value)}
              className="text-center !h-8 bg-background-subtle"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="g-input" className="text-sm font-medium">
              G
            </Label>
            <Input
              id="g-input"
              type="number"
              min="0"
              max="255"
              value={rgba.g}
              onChange={(e) => handleRgbaChange("g", e.target.value)}
              className="text-center !h-8 bg-background-subtle"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-input" className="text-sm font-medium">
              B
            </Label>
            <Input
              id="b-input"
              type="number"
              min="0"
              max="255"
              value={rgba.b}
              onChange={(e) => handleRgbaChange("b", e.target.value)}
              className="text-center !h-8 bg-background-subtle"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="a-input" className="text-sm font-medium">
              A
            </Label>
            <Input
              id="a-input"
              type="number"
              min="0"
              max="100"
              value={rgba.a}
              onChange={(e) => handleRgbaChange("a", e.target.value)}
              className="text-center !h-8 bg-background-subtle"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

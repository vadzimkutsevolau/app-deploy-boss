import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, value, {
        width: size,
        margin: 1,
        color: { dark: "#2a1d12", light: "#faf8f5" },
      }).catch(() => {});
    }
  }, [value, size]);
  return <canvas ref={ref} className="rounded-md" aria-label={`QR code for ${value}`} />;
}
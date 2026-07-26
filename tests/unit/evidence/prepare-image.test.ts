import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { downscaleForVision } from "@/lib/evidence/prepare-image";

describe("downscaleForVision", () => {
  it("shrinks a large PNG to a small JPEG suitable for vision OCR", async () => {
    const png = await sharp({
      create: {
        width: 2400,
        height: 3200,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const { buffer, mime } = await downscaleForVision(png, "image/png");
    expect(mime).toBe("image/jpeg");
    expect(buffer.byteLength).toBeLessThan(png.byteLength);

    const meta = await sharp(buffer).metadata();
    expect(meta.width ?? 0).toBeLessThanOrEqual(1280);
    expect(meta.height ?? 0).toBeLessThanOrEqual(1280);
    expect(meta.format).toBe("jpeg");
  });
});

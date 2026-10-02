/**
 * Calculates how many photographed fabric patches fit across a real product.
 * UV U maps to product width and UV V maps to product length.
 *
 * @param {{ productWidthCm: number, productLengthCm: number, patchWidthCm: number, patchLengthCm: number }} dimensions
 * @returns {[number, number]}
 */
export function calculateTextureRepeat(dimensions) {
  const { productWidthCm, productLengthCm, patchWidthCm, patchLengthCm } = dimensions;
  for (const value of Object.values(dimensions)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('Physical texture dimensions must be positive finite numbers.');
    }
  }
  return [productWidthCm / patchWidthCm, productLengthCm / patchLengthCm];
}

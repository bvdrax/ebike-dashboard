/**
 * Calculate points for an activity value given an activity type config.
 * Applies minimum_value check and optional points_increment rounding.
 *
 * With increment: floor(value / increment) * increment * points_per_unit
 *   e.g. 2.2 miles, increment=1, 20pts/mile → floor(2.2) * 1 * 20 = 40pts
 * Without increment: value * points_per_unit (rounded)
 */
function calcPoints(value, type) {
  const v = parseFloat(value);
  const minVal = parseFloat(type.minimum_value) || 0;
  const ppu = parseFloat(type.points_per_unit);
  const increment = type.points_increment ? parseFloat(type.points_increment) : null;

  if (minVal > 0 && v < minVal) return 0;

  if (increment && increment > 0) {
    const numIncrements = Math.floor(v / increment);
    return Math.round(numIncrements * increment * ppu);
  }
  return Math.round(v * ppu);
}

module.exports = { calcPoints };

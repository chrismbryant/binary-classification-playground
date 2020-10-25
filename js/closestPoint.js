/**
 * From https://bl.ocks.org/mbostock/8027637 
 */
function closestPoint(pathNode, point) {
  let pathLength = pathNode.getTotalLength(),
      precision = 64, // larger is less precise
      best,
      bestLength,
      bestDistance = Infinity;

  // linear scan for coarse approximation
  for (let scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
    scan = pathNode.getPointAtLength(scanLength);
    scanDistance = distance2(scan);
    if (scanDistance  < bestDistance) {
      best = scan;
      bestLength = scanLength;
      bestDistance = scanDistance;
    }
  }

  // binary search for precise estimate
  precision /= 2;
  while (precision > 0.5) {
    let beforeLength = bestLength - precision,
        before = pathNode.getPointAtLength(beforeLength),
        beforeDistance = distance2(before),
        afterLength = bestLength + precision,
        after = pathNode.getPointAtLength(afterLength),
        afterDistance = distance2(after);

    if (beforeLength >= 0 && beforeDistance < bestDistance) {
      best = before;
      bestLength = beforeLength;
      bestDistance = beforeDistance;
    } else if (afterLength <= pathLength && afterDistance < bestDistance) {
      best = after;
      bestLength = afterLength;
      bestDistance = afterDistance;
    } else {
      precision /= 2;
    }
  }

  best = [best.x, best.y];
  best.distance = Math.sqrt(bestDistance);
  return best;

  function distance2(p) {
    let dx = p.x - point[0],
        dy = p.y - point[1];
    return dx * dx + dy * dy;
  }
}

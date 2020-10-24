function scalarMultiply(coords, k) {
    return coords.map(([x, y]) => [x, k * y]);
}

function sumCurves(c1, c2) {
    return c1.map(([x, y], i) => [x, y + c2[i][1]]);
};

function divideCurves(c1, c2) {
    let divided =  c1.map(([x, y], i) => {
        const y2 = c2[i][1];
        return [x, y / y2];
    });
    divided.shift();
    divided.pop();
    return divided;
};

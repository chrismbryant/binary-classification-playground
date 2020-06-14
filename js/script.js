let imbalance = 0.5;
let curves = {
    "curve-neg-class": [],
    "curve-pos-class": [],
    "dist": [],
    "prob-calibration": []
}

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

function setupSVG(id, width, height) {
    let svg = d3.select(id)
        .attr("width", width)
        .attr("height", height);
    return svg;
}

/**
 * Get [x, y] coordinates of a beta distribution.
 * @param {number} alpha - "alpha" parameter of beta distribution
 * @param {number} beta - "beta" parameter of beta distribution
 * @param {number} resolution - number of steps to split the domain [0, 1] into
 * @returns {number[][]} dist - array of [x, y] coordinate pairs
 */
function getBetaPDF(alpha, beta, resolution = 200) {
    let dist = [];
    const xs = stdlib.linspace(0, 1, resolution);
    for (let i = 0; i < xs.length; i++) {
        const x = xs[i] * 1.0;
        const y = stdlib.base.dists.beta.pdf(x, alpha, beta);
        dist.push([x, y]);
    }
    return dist;
}

/** 
 * Create the SVG path string for a line chart
 * @param {number[][]} data - array of [x, y] coordinate pairs
 * @param {number} yMax - maximum plotting height
 * @returns {string} - SVG path string
 */
function getPath(data, yMax, svg) {

    const xMax = 1;
    const padding = 0;

    const width = svg.attr("width");
    const height = svg.attr("height");


    // Function to scale X values
    const scaleX = d3.scaleLinear()
        .domain([0, xMax])
        .range([0, width])

    // Function to scale Y values
    const scaleY = d3.scaleLinear()
        .domain([0, yMax])
        .range([0, height])

    // Function to specify path of Beta distribution plot
    const path = d3.area()
        .curve(d3.curveLinear)
        .x(d => scaleX(d[0]))
        .y(d => height - padding - scaleY(d[1]));

    return path(data);
}

function addSlider(sliderTable, sliderConfig, resolution = 200) {
    
    const min = 0;
    const max = resolution;

    const sliderId = sliderConfig[0];
    const sliderName = sliderConfig[1];
    const value = Math.round(sliderConfig[2] * resolution);

    let row = sliderTable.append("tr");
    
    row.append("td")
        .attr("class", "right-align")
        .text(sliderName);

    row.append("td")
        .append("input")
        .attr("type", "range")
        .attr("class", "slider")
        .attr("id", sliderId)
        .attr("min", min)
        .attr("max", max)
        .attr("value", value);

    row.append("td")
        .attr("class", "left-align")
        .attr("id", `${sliderId}-value`)
        // .text(value)
}

function addSliderValue(slider, sliderId) {
    d3.select(`#${sliderId}-value`)
        .text(slider.value);
}

function updateSlider(sliderId) {
    d3.select(`#${sliderId}`).on("input", function() {
        addSliderValue(this, sliderId)
    })
}

function getAlphaAndBeta(k, min=2, sum=14) {
    // k between 0 and 1
    const max = sum - min;
    const range = max - min;
    const alpha = min + k * range;
    const beta = sum - alpha;
    return [alpha, beta];
}

function initDistCurve(svg) {
    const color = "black";
    svg.append("path")
        .attr("id", "curve-dist")
        .attr("stroke-width", 3)
        .attr("stroke", color)
        .attr("stroke-opacity", 0.4)
    addDistCurve(svg);
}

function initBetaCurve(sliderId, curveId, color, svgDist, svgProb) {
    svgDist.append("path")
        .attr("id", curveId)
        .attr("stroke-width", 3)
        .attr("stroke", color);
}

function addBetaCurve(k, curveId, svg) {
    const [alpha, beta] = getAlphaAndBeta(k);
    const area = curveId.includes("pos") ? imbalance : (1 - imbalance);
    const pdf = scalarMultiply(getBetaPDF(alpha, beta), area);
    const path = getPath(pdf, betaMax, svg);
    d3.select(`#${curveId}`).attr("d", path);
    curves[curveId] = pdf;
}

function addDistCurve(svg) {
    curves["dist"] = sumCurves(
        curves["curve-pos-class"], 
        curves["curve-neg-class"]);
    const path = getPath(curves["dist"], betaMax, svg);
    svg.select("#curve-dist").attr("d", path);
}

function updateBetaCurve(sliderId, curveId, svgDist, svgProb) {
    d3.select(`#${sliderId}`).on("input", function() {
        const k = this.value / this.max;
        addBetaCurve(k, curveId, svgDist);
        addDistCurve(svgDist);
        addProbCalibration(svgProb);
    });
    const event = new Event("input");
    document.getElementById(sliderId).dispatchEvent(event);
}

function updateImbalance(svg) {
    d3.select("#slider-class-imb").on("input", function () {
        imbalance = this.value / this.max;
        const event = new Event("input");
        document.getElementById("slider-pos-class").dispatchEvent(event);
        document.getElementById("slider-neg-class").dispatchEvent(event);
    })
}

function initProbDiagonal(svg) {
    const w = svg.attr("width");
    const h = svg.attr("height");
    svg.append("path")
        .attr("id", "calibration-line")
        .attr("stroke-width", 2)
        .attr("stroke", "black")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "5,5")
        .attr("d", `M 0 ${h} L ${w} 0`)
}

function initProbCalibration(svg) {
    svg.append("path")
        .attr("id", "calibration-curve")
        .attr("stroke-width", 3)
        .attr("stroke", "black")
    addProbCalibration(svg);
}

function addProbCalibration(svg) {
    curves["prob-calibration"] = divideCurves(
        curves["curve-pos-class"],
        curves["dist"]);
    const path = getPath(curves["prob-calibration"], 1, svg);
    d3.select("#calibration-curve").attr("d", path);
}

/** ---------------------------------------------------------------- */

svgWidth = 600;
sliderResolution = 200;
betaMax = 4;

const tabColors = [
    "#1F77B4", 
    "#FF7F0E", 
    "#2CA02C", 
    "#D62728", 
    "#9467BD", 
    "#8C564B", 
    "#CFECF9", 
    "#7F7F7F", 
    "#BCBD22", 
    "#17BECF"
]

const sliderConfigs = [
    ["slider-neg-class", "Negative Class", 0],
    ["slider-pos-class", "Positive Class", 1],
    ["slider-class-imb", "Class imbalance", 0.5],
    ["slider-FP-cost", "FP Cost", 0.3],
    ["slider-FN-cost", "FN Cost", 0.2],
    ["slider-TP-benefit", "TP Benefit", 0],
    ["slider-TN-benefit", "TN Benefit", 0],
    ["slider-review-cost", "Review Cost", 0]
];

let svgDist = setupSVG("#svg-dist", svgWidth, 200);
let svgProb = setupSVG("#svg-prob-calibration", svgWidth, 200);

let sliderTable = d3.select("#sliders")
    .append("table");

sliderConfigs.forEach(sliderConfig => {
    addSlider(sliderTable, sliderConfig, sliderResolution);
    // updateSlider(sliderConfig[0]);
});



initDistCurve(svgDist);
initBetaCurve("slider-neg-class", "curve-neg-class", "#1F77B4", svgDist);
initBetaCurve("slider-pos-class", "curve-pos-class", "#FF7F0E", svgDist);

initProbDiagonal(svgProb);
initProbCalibration(svgProb);

updateBetaCurve("slider-neg-class", "curve-neg-class", svgDist, svgProb);
updateBetaCurve("slider-pos-class", "curve-pos-class", svgDist, svgProb);
updateImbalance(svgDist);




/** ---------------------------------- SETUP ---------------------------------- */

function setupSVG(id, width, height) {
    let svg = d3.select(id)
        .attr("width", width)
        .attr("height", height);
    return svg;
}

/** -------------------------------- ARRAY MATH -------------------------------- */

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

/** -------------------------------- `GET` -------------------------------- */

function getAlphaAndBeta(k, min=2, sum=14) {
    // k between 0 and 1
    const max = sum - min;
    const range = max - min;
    const alpha = min + k * range;
    const beta = sum - alpha;
    return [alpha, beta];
}

/**
 * Get [x, y] coordinates of a beta distribution.
 * @param {number} alpha - "alpha" parameter of beta distribution
 * @param {number} beta - "beta" parameter of beta distribution
 * @returns {number[][]} dist - array of [x, y] coordinate pairs
 */
function getBetaPDF(alpha, beta) {
    let dist = [];
    const xs = stdlib.linspace(0, 1, curveResolution);
    for (let i = 0; i < xs.length; i++) {
        const x = xs[i] * 1.0;
        const y = stdlib.base.dists.beta.pdf(x, alpha, beta);
        dist.push([x, y]);
    }
    return dist;
}

function getCostCurve(kPos, kNeg) {
    let costs = [];
    const xs = stdlib.linspace(0, 1, curveResolution);
    const [alphaPos, betaPos] = getAlphaAndBeta(kPos);
    const [alphaNeg, betaNeg] = getAlphaAndBeta(kNeg);
    const wPos = imbalance;
    const wNeg = 1 - imbalance;
    for (let i = 0; i < xs.length; i++) {
        const x = xs[i] * 1.0;
        const FN = wPos * stdlib.base.dists.beta.cdf(x, alphaPos, betaPos);
        const TP = wPos - FN;
        const TN = wNeg * stdlib.base.dists.beta.cdf(x, alphaNeg, betaNeg);
        const FP = wNeg - TN;
        const reviewed = TP + FP;
        const cost = [
            FP * weights["FP"],
            FN * weights["FN"],
            -TP * weights["TP"],
            -TN * weights["TN"],
            reviewed * weights["review"]
        ].reduce((u, v) => u + v, 0);
        costs.push([x, cost]);
    }
    return costs;
}

function getOptimum(weights) {
    const num = weights["FP"] + weights["TN"] + weights["review"];
    const den = weights["FP"] + weights["FN"] + weights["TN"] + weights["TP"];
    const opt = den == 0 ? 0.5 : (num / den);
    return opt;
}

function getScoreFromProb(prob) {
    let index = 0;
    let score = 0;
    let diff = 1;
    curves["prob-calibration"].forEach(([s, p], i) => {
        const d = Math.abs(prob - p);
        if (d <= diff) {
            diff = d;
            score = s;
            index = i + 1;
        }
    });
    return [score, index];
}

function getScalingFunctions(yRng, svg) {

    const [yMin, yMax] = yRng;
    const width = svg.attr("width");
    const height = svg.attr("height");

    // Function to scale X values
    const scaleX = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);

    // Function to scale Y values
    const scaleY = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([height, 0]);

    return [scaleX, scaleY];
}

/** 
 * Create the SVG path string for a line chart
 * @param {number[][]} data - array of [x, y] coordinate pairs
 * @param {number[]} yRng - [min, max] plotting height
 * @returns {string} - SVG path string
 */
function getPath(data, yRng, svg) {

    // Create functions to scale X and Y values
    const [scaleX, scaleY] = getScalingFunctions(yRng, svg);

    // Function to specify path of Beta distribution plot
    const path = d3.area()
        .curve(d3.curveLinear)
        .x(d => scaleX(d[0]))
        .y(d => scaleY(d[1]));

    return path(data);
}

function getPosition(data, yRng, svg) {

    const [scaleX, scaleY] = getScalingFunctions(yRng, svg);
    const [x, y] = [scaleX(data[0]), scaleY(data[1])];
    return [x, y];
}

/** -------------------------------- `INIT` -------------------------------- */

function initBetaCurve(sliderId, curveId, color, svgDist, svgProb) {
    svgDist.append("path")
        .attr("id", curveId)
        .attr("stroke-width", 3)
        .attr("stroke", color);
}

function initDistCurve(svg) {
    svg.append("path")
        .attr("id", "curve-dist")
        .attr("stroke-width", 3)
        .attr("stroke", "#2ca02c");
    addDistCurve(svg);
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
        .attr("stroke", "#5c6068")
    addProbCalibration(svg);
}

function initCostCurve(svg) {
    svg.append("path")
        .attr("id", "curve-cost")
        .attr("stroke-width", 3)
        .attr("stroke", "#d62728");
    addCostCurve(svg);
}

function initOptimum(optId, svg) {
    svg.append("circle")
        .attr("id", optId)
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("fill", "white");
}

/** ------------------------------- `ADD` --------------------------------- */

function addSlider(sliderTable, sliderConfig, resolution = 200) {
    
    const min = 0;
    const max = resolution;

    const sliderId = sliderConfig[0];
    const sliderName = sliderConfig[1];
    const value = Math.round(sliderConfig[2] * resolution);

    let row = sliderTable.append("tr");
    
    row.append("td")
        .attr("id", `${sliderId}-name`)
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
}

function addClassSliderColor() {
    const reversed = ks["curve-neg-class"] > ks["curve-pos-class"]
    if (!anticalibrated && reversed) {
        anticalibrated = true;
        color = "#d62728"
        d3.select("#slider-neg-class-name")
            .attr("style", `color:${color}`);
        d3.select("#slider-pos-class-name")
            .attr("style", `color:${color}`);
    } else if (anticalibrated && !reversed) {
        anticalibrated = false;
        d3.select("#slider-neg-class-name")
            .attr("style", "color:black");
        d3.select("#slider-pos-class-name")
            .attr("style", "color:black");
    }
}

function addBetaCurve(k, curveId, svg) {
    const [alpha, beta] = getAlphaAndBeta(k);
    const area = curveId.includes("pos") ? imbalance : (1 - imbalance);
    const pdf = scalarMultiply(getBetaPDF(alpha, beta), area);
    const path = getPath(pdf, [0, betaMax], svg);
    d3.select(`#${curveId}`).attr("d", path);
    curves[curveId] = pdf;
}

function addDistCurve(svg) {
    curves["dist"] = sumCurves(
        curves["curve-pos-class"], 
        curves["curve-neg-class"]);
    const path = getPath(curves["dist"], [0, betaMax], svg);
    svg.select("#curve-dist").attr("d", path);
}

function addProbCalibration(svg) {
    curves["prob-calibration"] = divideCurves(
        curves["curve-pos-class"],
        curves["dist"]);
    const path = getPath(curves["prob-calibration"], [0, 1], svg);
    d3.select("#calibration-curve").attr("d", path);
}

function addCostCurve(svg) {
    const kPos = ks["curve-pos-class"];
    const kNeg = ks["curve-neg-class"];
    curves["cost"] = getCostCurve(kPos, kNeg);
    const path = getPath(curves["cost"], costRng, svg);
    d3.select("#curve-cost").attr("d", path);}

function addOptimum(weights, svgCost, svgProb) {
    
    const prob = getOptimum(weights);
    const [score, index] = getScoreFromProb(prob);

    const coordsCost = curves["cost"][index];
    const [xCost, yCost] = getPosition(coordsCost, costRng, svgCost);
    d3.select("#cost-optimum")
        .attr("cx", xCost)
        .attr("cy", yCost);

    if (curves["prob-calibration"].length != 0) {
        const iMax = curves["prob-calibration"].length - 1
        const i = Math.min(index + 1, iMax);
        const coordsProb = curves["prob-calibration"][i];
        const [xProb, yProb] = getPosition(coordsProb, [0, 1], svgProb);
        d3.select("#prob-optimum")
            .attr("cx", xProb)
            .attr("cy", yProb);
    }
}

/** -------------------------------- `UPDATE` -------------------------------- */

function updateBetaCurve(sliderId, curveId, svgDist, svgProb, svgCost) {
    d3.select(`#${sliderId}`).on("input", function() {
        const k = this.value / this.max;
        ks[curveId] = k;
        addBetaCurve(k, curveId, svgDist);
        addDistCurve(svgDist);
        addProbCalibration(svgProb);
        addCostCurve(svgCost);
        addOptimum(weights, svgCost, svgProb);
        addClassSliderColor();
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
    });
}

function updateCostCurve(sliderId, svgCost, svgProb) {
    d3.select(`#${sliderId}`).on("input", function() {
        const w = this.value / this.max;
        const key = sliderId.split("-")[1];
        weights[key] = w;
        addCostCurve(svgCost);
        addOptimum(weights, svgCost, svgProb);
    });
}

/** ---------------------------------------------------------------- */

let anticalibrated = false;
let imbalance = 0.5;
let ks = {
    "curve-pos-class": 0,
    "curve-neg-class": 0
}
let weights = {
    "FP": 0.3,
    "FN": 0.2,
    "TP": 0,
    "TN": 0,
    "review": 0
};
let curves = {
    "curve-neg-class": [],
    "curve-pos-class": [],
    "dist": [],
    "prob-calibration": [],
    "cost": []
};

const svgWidth = 600;
const curveResolution = 500;
const sliderResolution = 500;
const betaMax = 4;
const costRng = [-1, 1];

const sliderConfigs = [
    ["slider-neg-class", "Negative Class", 0],
    ["slider-pos-class", "Positive Class", 1],
    ["slider-class-imb", "Imbalance", 0.5],
    ["slider-FP-cost", "FP Cost", weights["FP"]],
    ["slider-FN-cost", "FN Cost", weights["FN"]],
    ["slider-TP-benefit", "TP Benefit", weights["TP"]],
    ["slider-TN-benefit", "TN Benefit", weights["TN"]],
    ["slider-review-cost", "Review Cost", weights["review"]]
];

let svgCost = setupSVG("#svg-cost", svgWidth, 200);
let svgDist = setupSVG("#svg-dist", svgWidth, 200);
let svgProb = setupSVG("#svg-prob-calibration", svgWidth, 200);

let sliderTable = d3.select("#sliders").append("table");

sliderConfigs.forEach(sliderConfig => {
    addSlider(sliderTable, sliderConfig, sliderResolution);
});


initDistCurve(svgDist);
initBetaCurve("slider-neg-class", "curve-neg-class", "#1F77B4", svgDist);
initBetaCurve("slider-pos-class", "curve-pos-class", "#FF7F0E", svgDist);
initProbDiagonal(svgProb);
initProbCalibration(svgProb);
initCostCurve(svgCost);
initOptimum("cost-optimum", svgCost);
initOptimum("prob-optimum", svgProb);


updateBetaCurve("slider-neg-class", "curve-neg-class", svgDist, svgProb, svgCost);
updateBetaCurve("slider-pos-class", "curve-pos-class", svgDist, svgProb, svgCost);
updateImbalance(svgDist);
updateCostCurve("slider-FP-cost", svgCost, svgProb);
updateCostCurve("slider-FN-cost", svgCost, svgProb);
updateCostCurve("slider-TP-benefit", svgCost, svgProb);
updateCostCurve("slider-TN-benefit", svgCost, svgProb);
updateCostCurve("slider-review-cost", svgCost, svgProb);

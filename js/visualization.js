/** ------------------------------- GLOBALS & RUN --------------------------------- */

const mediumLink = "https://medium.com/@cbryant_67006/choosing-the-right-model-threshold-a91bc48f354";
const gitHubLink = "https://github.com/chrismbryant/binary-classification-playground";
const stdlibPath = "https://unpkg.com/@stdlib/stdlib@0.0.91/dist/stdlib-flat.min.js";

let anticalibrated = false;
let imbalance = 0.5;
let shapeMin = 2;
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
let probTexSize;
let costTexSize;
const equations = {
    "curve-neg-class": "f(s | y = 0)",
    "curve-pos-class": "f(s | y = 1)",
    "curve-dist": "f(s)",
    "calibration-curve": "P(s) := \\frac{f(s | y = 1)}{f(s)}",
    "calibration-line": "P(s) = s",
    "curve-cost": "C(t = s)",
    "optimum-coord-prob": "\\bigl(\\tau, P(\\tau)\\bigr)",
    "optimum-coord-cost": "\\bigl(\\tau, C(\\tau)\\bigr)",
    "optimal-threshold": "P(\\tau) = \\frac{k_{FP} + k_{TN} + k_{rev}}{k_{FP} + k_{FN} + k_{TN} + k_{TP}}"
};

const svgWidth = 600;
const curveResolution = 500;
const sliderResolution = 500;
const betaMax = 4;
const costRng = [-1, 1];

const sliderConfigs = [
    ["slider-FP-cost", "Cost (FP)", weights["FP"], "\\(k_{FP}\\)"],
    ["slider-FN-cost", "Cost (FN)", weights["FN"], "\\(k_{FN}\\)"],
    ["slider-TP-benefit", "Benefit (TP)", weights["TP"], "\\(k_{TP}\\)"],
    ["slider-TN-benefit", "Benefit (TN)", weights["TN"], "\\(k_{TN}\\)"],
    ["slider-review-cost", "Review Cost", weights["review"], "\\(k_{rev}\\)"],
    ["slider-neg-class", "Negative Class", 0, ""],
    ["slider-pos-class", "Positive Class", 0.84, ""],
    ["slider-class-imb", "Balance", 0.5, ""],
    // ["slider-dist-shape", "Shape", 0.5, ""]
];

// Run all
main();

function main() {
    let [svgCost, svgDist, svgProb] = setupPage(svgWidth);
    addSpinner(svgCost);
    addSpinner(svgDist);
    addSpinner(svgProb);
    addSliderTable(sliderConfigs, sliderResolution);
    loadScript(stdlibPath, function() {
        removeAllSpinners();
        addViz(svgCost, svgDist, svgProb);
    });
}

function addViz(svgCost, svgDist, svgProb) {

    initDistCurve(svgDist);
    initBetaCurve("slider-neg-class", "curve-neg-class", "#1F77B4", svgDist);
    initBetaCurve("slider-pos-class", "curve-pos-class", "#FF7F0E", svgDist);
    initProbOptimumLine(svgProb);
    initCostOptimumLine(svgCost);
    initProbDiagonal(svgProb);
    initProbCalibration(svgProb);
    initCostCurve(svgCost);
    initOptimum("cost-optimum", svgCost);
    initOptimum("prob-optimum", svgProb);
    initOptimumCoordTex(svgProb, svgCost, equations);

    updateBetaCurve("slider-neg-class", "curve-neg-class", svgDist, svgProb, svgCost);
    updateBetaCurve("slider-pos-class", "curve-pos-class", svgDist, svgProb, svgCost);
    updateImbalance();
    updateShape();
    updateCostCurve("slider-FP-cost", svgCost, svgProb);
    updateCostCurve("slider-FN-cost", svgCost, svgProb);
    updateCostCurve("slider-TP-benefit", svgCost, svgProb);
    updateCostCurve("slider-TN-benefit", svgCost, svgProb);
    updateCostCurve("slider-review-cost", svgCost, svgProb);

    addDescriptions(svgCost, equations);
    addDescriptions(svgProb, equations);
    addDescriptions(svgDist, equations);
    
}

/** ---------------------------------- SETUP ---------------------------------- */

function setupPage(svgWidth) {
    
    let content = d3.select("#content");
    let contentTable = content
        .append("div")
        .attr("id", "main-table")
        .attr("class", "vertical-center")
        .append("table");
    addFooter(content);
    
    // Add title
    contentTable.append("tr")
        .append("td")
        .attr("colspan", 3)
        .append("p")
        .text("Binary Misclassification Cost")
        .attr("class", "title");

    contentTable.append("tr").append("td");
    contentTable = contentTable.append("tr");

    // Add SVGs
    let svgTable = contentTable
        .append("td")
        .append("div")
        .attr("id", "svgs")
        .append("table");
    let svgCost = addSVG(
        svgTable, "svg-cost", "Cost", svgWidth, 200);
    let svgProb = addSVG(
        svgTable, "svg-prob-calibration", "Probability Calibration", svgWidth, 200);
    let svgDist = addSVG(
        svgTable, "svg-dist", "Model Distribution", svgWidth, 200);

    contentTable.append("td").attr("class", "padded");

    // Add sliders
    contentTable.append("td")
        .append("div")
        .attr("id", "sliders");
    
    return [svgCost, svgDist, svgProb];
}

function addFooter(content) {

    const iconSize = 30;

    let footer = content.append("footer");

    let row = footer
        .append("table")
        .attr("class", "footer-table")
        .append("tr");

    let gitHub = row.append("a")
        .attr("href", gitHubLink)
        .attr("target", "_blank")
    let divider = row.append("td")
        .append("span")
        .attr("class", "vertical-line");
    let medium = row.append("a")
        .attr("href", mediumLink)
        .attr("target", "_blank")

    gitHub.append("td")
        .text("Source Code");
    gitHub.append("td")
        .append("img")
        .attr("src", "./img/github-logo.png")
        .attr("height", iconSize);

    medium.append("td")
        .append("img")
        .attr("src", "./img/medium-logo.png")
        .attr("height", iconSize);
    medium.append("td")
        .text("Blog Post");
}

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
    const [alphaPos, betaPos] = getAlphaAndBeta(kPos, shapeMin);
    const [alphaNeg, betaNeg] = getAlphaAndBeta(kNeg, shapeMin);
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
        .attr("class", "curve thin")
        .attr("id", curveId)
        .attr("stroke", color);
}

function initDistCurve(svg) {
    svg.append("path")
        .attr("class", "curve thin")
        .attr("id", "curve-dist")
        .attr("stroke", "#2ca02c");
    addDistCurve(svg);
}

function initProbDiagonal(svg) {
    const w = svg.attr("width");
    const h = svg.attr("height");
    svg.append("path")
        .attr("class", "curve extra-thin")
        .attr("id", "calibration-line")
        .attr("stroke", "black")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "5,5")
        .attr("d", `M 0 ${h} L ${w} 0`);
}

function initProbCalibration(svg) {
    svg.append("path")
        .attr("class", "curve thin")
        .attr("id", "calibration-curve")
        .attr("stroke", "#5c6068")
    addProbCalibration(svg);
}

function initProbOptimumLine(svg) {
    svg.append("path")
        .attr("id", "prob-optimum-line")
        .attr("class", "optimum-line")
        .attr("stroke-opacity", 0);
}

function initCostOptimumLine(svg) {
    svg.append("path")
        .attr("id", "cost-optimum-line")
        .attr("class", "optimum-line")
        .attr("stroke-opacity", 0);
}

function initCostCurve(svg) {
    svg.append("path")
        .attr("class", "curve thin")
        .attr("id", "curve-cost")
        .attr("stroke", "#d62728");
    addCostCurve(svg);
}

function initOptimum(optId, svg) {
    svg.append("circle")
        .attr("class", "optimum")
        .attr("id", optId)
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("fill", "white");
}

function initOptimumCoordTex(svgProb, svgCost, equations) {
    const probTexId = "optimum-coord-prob";
    const costTexId = "optimum-coord-cost";
    const threshTexId = "optimal-threshold";
    probTexSize = addTex(svgProb, equations[probTexId], probTexId);
    costTexSize = addTex(svgCost, equations[costTexId], costTexId);

    const w = svgProb.attr("width");
    const h = svgProb.attr("height");
    addTex(svgProb, equations[threshTexId], threshTexId, w - 10, h - 10);
}

/** ------------------------------ Style -------------------------------- */

function addHoverEmphasis(svg) {
    
    svg.on("mousemove", function() {
        const m = d3.mouse(this);
        const paths = Array.from(svg.selectAll("path.curve")._groups[0]).reverse();
        const closestPoints = paths.map(path => closestPoint(path, m));
        const distances = closestPoints.map(p => Math.floor(p.distance));
        const minDistance = Math.min(...distances);
        const minIndex = distances.indexOf(minDistance);
        const closestCurve = paths[minIndex].id

        const optimumIsSelected = d3.select("#prob-optimum-line")
            .attr("stroke-opacity") == 1;

        for (i in paths) {
            const path = paths[i];
            if (path.id == closestCurve && minDistance < 40 && !optimumIsSelected) {
                d3.select(`#${path.id}`)
                    .classed("smooth", true)
                    .classed("thick", true);
                d3.select(`#${path.id}-equation`)
                    .classed("visible", true);
            } else {
                d3.select(`#${path.id}`)
                    .classed("thick", false);
                d3.select(`#${path.id}-equation`)
                    .classed("visible", false);
            }
        }
    });

    svg.on("mouseleave", removeHoverEmphasis);
}

function removeHoverEmphasis() {
    d3.selectAll(".curve")
        .classed("thick", false)
        .classed("smooth", false);
    d3.selectAll(".equation")
        .classed("visible", false);
}

/** ------------------------------- `ADD` --------------------------------- */

function addDescriptions(svg, equations) {
    const curves = Array.from(svg.selectAll("path.curve")._groups[0]);
    const width = svg.attr("width");
    const height = svg.attr("height");
    for (i in curves) {
        const curveId = curves[i].id;
        const eqId = `${curveId}-equation`;
        addTex(svg, equations[curveId], eqId, width - 15, height - 15);
    }
}

function addTex(svg, tex, texId, x = 0, y = 0) {
    const width = svg.attr("width");
    const height = svg.attr("height");
    let g = svg.append("g")
        .attr("class", "equation smooth")
        .attr("id", texId);
    g.append(() => MathJax.tex2svg(tex).querySelector("svg"));
    const texBBox = document.getElementById(texId).getBBox();
    const texWidth = texBBox.width;
    const texHeight = texBBox.height;
    g.attr("transform", `translate(
        ${x - texWidth}, 
        ${y - texHeight})`);
    const texSize = [texWidth, texHeight];
    return texSize;
}

function addSVG(svgTable, id, label, width, height) {
    let svg = svgTable
        .append("tr")
        .attr("class", "svg-table")
        .append("td")
        .attr("class", "svg-table")
        .append("svg")
        .attr("id", id)
        .attr("class", "svg-plot")
        .attr("width", width)
        .attr("height", height);
    svg.append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-size", 14)
        .text(label);
    addHoverEmphasis(svg);
    return svg;
}

function addSliderTable(sliderConfigs, sliderResolution) {

    // Initialize slider table
    let sliderTable = d3.select("#sliders")
        .append("table")
        .attr("class", "slider-table")
        // .append("td")

    sliderTable.append("tr")
        .append("td")
        .attr("colspan", 2)
        .append("p")
        .text("Adjust Costs")
        .attr("class", "slider-heading");

    // Add cost sliders
    sliderConfigs.slice(0, 5).forEach(sliderConfig => {
        addSlider(sliderTable, sliderConfig, sliderResolution);
    });

    let blankRow = sliderTable.append("tr");
    blankRow.append("br");
    blankRow.append("br");
    blankRow.append("br");

    sliderTable.append("tr")
        .append("td")
        .attr("colspan", 2)
        .append("p")
        .text("Adjust Distribution")
        .attr("class", "slider-heading");

    // Add distribution sliders
    sliderConfigs.slice(5, 9).forEach(sliderConfig => {
        addSlider(sliderTable, sliderConfig, sliderResolution);
    });
}

function addTooltip(divId, text) {
    d3.select(`#${divId}`)
        .classed("hasTooltip", true)
        .append("span")
        .attr("class", "tooltiptext")
        .text(text);
}

function addSlider(sliderTable, sliderConfig, resolution = 200) {
    
    const min = 0;
    const max = resolution;

    const sliderId = sliderConfig[0];
    const sliderName = sliderConfig[1];
    const value = Math.round(sliderConfig[2] * resolution);

    let row = sliderTable
        .append("tr");
    
    row.append("td")
        .attr("class", "right-align")
        .append("div")
        .attr("id", `${sliderId}-name`)
        .text(sliderName);

    if (sliderConfig[3] != "") {
        addTooltip(`${sliderId}-name`, sliderConfig[3]);
    }

    let cell = row.append("td")

    cell.append("input")
        .attr("type", "range")
        .attr("class", "slider")
        .attr("id", sliderId)
        .attr("min", min)
        .attr("max", max)
        .attr("value", value);

    // cell.append("output")
    //     .attr("id", `${sliderId}-output`)
    //     .attr("class", "bubble")
    //     .text(value / max);
}

function addClassSliderColor() {
    const reversed = ks["curve-neg-class"] > ks["curve-pos-class"]
    if (!anticalibrated && reversed) {
        anticalibrated = true;
        color = "#d62728"
        d3.select("#slider-neg-class-name")
            .attr("style", `color:${color}; font-style:italic`);
        d3.select("#slider-pos-class-name")
            .attr("style", `color:${color}; font-style:italic`);
    } else if (anticalibrated && !reversed) {
        anticalibrated = false;
        d3.select("#slider-neg-class-name")
            .attr("style", "color:black");
        d3.select("#slider-pos-class-name")
            .attr("style", "color:black");
    }
}

function addBetaCurve(k, curveId, svg) {
    const [alpha, beta] = getAlphaAndBeta(k, shapeMin);
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
    d3.select("#curve-cost").attr("d", path);
}

function addOptimum(weights, svgCost, svgProb) {
    
    const prob = getOptimum(weights);
    const [score, index] = getScoreFromProb(prob);

    // Add circle at Cost optimum
    const coordsCost = curves["cost"][index];
    const [xCost, yCost] = getPosition(coordsCost, costRng, svgCost);
    d3.select("#cost-optimum")
        .attr("cx", xCost)
        .attr("cy", yCost);
    d3.select("#cost-optimum-line")
        .attr("d", `M 
            ${xCost} ${svgCost.attr("height")} L 
            ${xCost} ${yCost}`);
    d3.select("#optimum-coord-cost")
        .attr("transform", `translate(
            ${xCost - probTexSize[0] / 2},
            ${yCost - probTexSize[1] - 10})`);

    // Add circle at Probability corresponding to Cost optimum
    if (curves["prob-calibration"].length != 0) {
        const iMax = curves["prob-calibration"].length - 1
        const i = Math.min(index + 1, iMax);
        const coordsProb = curves["prob-calibration"][i];
        const [xProb, yProb] = getPosition(coordsProb, [0, 1], svgProb);
        d3.select("#prob-optimum")
            .attr("cx", xProb)
            .attr("cy", yProb);
        d3.select("#prob-optimum-line")
            .attr("d", `M 
                0 ${yProb} L 
                ${xProb} ${yProb} L
                ${xProb} 0`);
        d3.select("#optimum-coord-prob")
            .attr("transform", `translate(
                ${xProb - probTexSize[0] - 10},
                ${yProb - probTexSize[1] - 5})`);
    }

    // Set mouseover behavior to show guide lines and equations
    d3.selectAll(".optimum")
        .on("mouseover", function () {
            d3.selectAll(".optimum-line")
                .classed("smooth", true)
                .attr("stroke-opacity", 1);
            d3.select("#optimum-coord-prob").classed("visible", true);
            d3.select("#optimum-coord-cost").classed("visible", true);
            d3.select("#optimal-threshold").classed("visible", true);
        }).on("mouseout", function () {
            d3.selectAll(".optimum-line")
                .attr("stroke-opacity", 0);
            d3.select("#optimum-coord-prob").classed("visible", false);
            d3.select("#optimum-coord-cost").classed("visible", false);
            d3.select("#optimal-threshold").classed("visible", false);
        })
}

function addSliderOutput(sliderId, value) {
    // const sliderWidth = 400;
    // const position = value * 400;
    // console.log(sliderWidth);
    // d3.select(`#${sliderId}-output`)
    //     .text(value);
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
        addSliderOutput(sliderId, k);
    });
    const event = new Event("input");
    document.getElementById(sliderId).dispatchEvent(event);
}

function updateImbalance() {
    const sliderId = "slider-class-imb";
    d3.select(`#${sliderId}`).on("input", function () {
        imbalance = this.value / this.max;
        const event = new Event("input");
        addSliderOutput(sliderId, imbalance);
        document.getElementById("slider-pos-class").dispatchEvent(event);
        document.getElementById("slider-neg-class").dispatchEvent(event);
    });
}

function updateShape() {
    const shapeBounds = [1, 3];
    const shapeRng = shapeBounds[1] - shapeBounds[0];
    const sliderId = "slider-dist-shape"; 
    d3.select(`#${sliderId}`).on("input", function () {
        const frac = this.value / this.max;
        shapeMin = shapeBounds[0] + shapeRng * frac;
        addSliderOutput(sliderId, frac);
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
        addSliderOutput(sliderId, w);
    });
}

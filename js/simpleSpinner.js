function addSpinner(svg) {
    const numDots = 3;
    const rand = Math.random() * 60;
    let dots = svg
        .append("g")
        .attr("class", "dots");
    for (i = 0; i < numDots; i++) {
        let g = dots.append("g");
        const width = svg.attr("width");
        const height = svg.attr("height");
        g.append("circle")
            .attr("r", 5)
            .attr("cx", width / 40)
            .attr("opacity", 0.5)
            .attr("class", "spinner-border");
        g.attr("transform", `
            translate(${width / 2} ${height / 2})
            rotate(${360 / numDots * i + rand})`);
    }
}

function removeAllSpinners() {
    d3.selectAll(".dots").remove();
}

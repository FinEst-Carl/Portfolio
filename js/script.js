const speeds = {
    slow: 4000,
    fast: 1200
};

const drawOrder = ["slow", "fast"];

function animatePath(path, duration) {
    const length = path.getTotalLength();

    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    path.getBoundingClientRect();

    return path.animate([
        { strokeDashoffset: length },
        { strokeDashoffset: 0 }
    ], {
        duration: duration,
        easing: "ease-in-out",
        fill: "forwards"
    }).finished;
}

async function draw(svgDoc) {
    const paths = svgDoc.querySelectorAll("path");

    for (let i = 0; i < paths.length; i++) {

        const speedKey = drawOrder[i] || "slow";
        const duration = speeds[speedKey];

        await animatePath(paths[i], duration);

        await new Promise(r => setTimeout(r, 300));
    }
}

window.addEventListener("load", () => {
    const object = document.getElementById("mySvg");

    object.addEventListener("load", () => {
        const svgDoc = object.contentDocument;

        if (!svgDoc) return;

        draw(svgDoc);
    });
});

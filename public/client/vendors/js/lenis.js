const lenis = new Lenis({
autoRaf: true,
duration: 3
});

function raf(time) {
lenis.raf(time)
requestAnimationFrame(raf)
}

requestAnimationFrame(raf);
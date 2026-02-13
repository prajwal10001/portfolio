import { useEffect, useRef } from 'react';

export function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let width: number;
        let height: number;
        let phase = 0;
        let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];

        const init = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            particles = [];

            for (let i = 0; i < 50; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            const rows = 4;
            const cols = 60;
            const spacingX = width / cols;
            const spacingY = 60; // Spread waves further apart vertically

            for (let r = 0; r < rows; r++) {
                ctx.beginPath();
                // Soft vibrant red with fading alpha for depth
                ctx.strokeStyle = `rgba(239, 68, 68, ${0.35 - (r * 0.08)})`;
                ctx.lineWidth = 4; // Bolder lines for "bigger" feel

                let prevY = 0;

                for (let c = 0; c <= cols; c++) {
                    const x = c * spacingX;

                    // LARGE MOTION LOGIC:
                    // Slow phase for smoothness, large multipliers (80 and 120) for height
                    const mainWave = Math.sin((c * 0.05) + phase) * 80;
                    const secondaryWave = Math.cos((c * 0.03) + (phase * 0.8)) * 120;

                    // Oscillate around the center of the screen
                    const y = (height * 0.5) + (r * spacingY) + mainWave + secondaryWave;

                    if (c === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        // Quadratic curve interpolation for much smoother wave points
                        const prevX = (c - 1) * spacingX;
                        const cpX = (prevX + x) / 2;
                        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
                    }
                    prevY = y;
                }
                ctx.stroke();
            }

            // Particles
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                // Fade particles based on proximity to wave center
                const waveY = (height * 0.6) + Math.sin((p.x / width * 6) + phase) * 20;
                const opacity = 1 - Math.abs(p.y - waveY) / 200;

                if (opacity > 0) {
                    ctx.globalAlpha = opacity;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
            });

            phase += 0.008; // Slower increment for buttery smooth animation
            animationId = requestAnimationFrame(animate);
        };

        init();
        animate();

        window.addEventListener('resize', init);

        return () => {
            window.removeEventListener('resize', init);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-80"
        />
    );
}

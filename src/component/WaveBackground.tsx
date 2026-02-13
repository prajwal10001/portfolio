import { useEffect, useRef } from 'react';

interface WaveLine {
    amplitude: number;
    frequency: number;
    speed: number;
    phase: number;
    color: string;
    opacity: number;
    blur: number;
    lineWidth: number;
    yPosition: number;
}

export function WaveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let width: number;
        let height: number;
        let time = 0;

        // Wave line configuration - 6 layers of flowing curved lines
        // Colors: Deep crimson/burgundy with magenta accents
        // EXTREMELY SLOW animation - barely perceptible, zen-like flow
        const waveLines: WaveLine[] = [
            // Background lines - nearly static
            {
                amplitude: 80,
                frequency: 0.8,
                speed: 0.0000006,
                phase: 0,
                color: '#5a0a1f',
                opacity: 0.35,
                blur: 15,
                lineWidth: 2,
                yPosition: 0.70,
            },
            {
                amplitude: 90,
                frequency: 0.7,
                speed: 0.0000008,
                phase: Math.PI * 0.3,
                color: '#6b0f25',
                opacity: 0.30,
                blur: 12,
                lineWidth: 1.5,
                yPosition: 0.62,
            },
            // Mid layers
            {
                amplitude: 70,
                frequency: 1.0,
                speed: 0.0000010,
                phase: Math.PI * 0.7,
                color: '#8B1538',
                opacity: 0.45,
                blur: 10,
                lineWidth: 2.5,
                yPosition: 0.55,
            },
            {
                amplitude: 60,
                frequency: 1.1,
                speed: 0.0000012,
                phase: Math.PI * 1.2,
                color: '#A0153E',
                opacity: 0.50,
                blur: 8,
                lineWidth: 2,
                yPosition: 0.48,
            },
            // Foreground accent lines
            {
                amplitude: 50,
                frequency: 1.3,
                speed: 0.0000014,
                phase: Math.PI * 1.6,
                color: '#E91E63',
                opacity: 0.45,
                blur: 6,
                lineWidth: 2,
                yPosition: 0.42,
            },
            {
                amplitude: 40,
                frequency: 1.5,
                speed: 0.0000016,
                phase: Math.PI * 2.0,
                color: '#FF4081',
                opacity: 0.35,
                blur: 5,
                lineWidth: 1.5,
                yPosition: 0.38,
            },
        ];

        const init = () => {
            const dpr = window.devicePixelRatio || 1;
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);
        };

        const drawCurvedLine = (line: WaveLine, animTime: number) => {
            const points: { x: number; y: number }[] = [];
            const segments = Math.ceil(width / 6); // High resolution for ultra-smooth curves

            // Generate wave points using multiple sine waves for organic, flowing curves
            for (let i = 0; i <= segments; i++) {
                const x = (i / segments) * (width + 300) - 150; // Extend beyond viewport
                const normalizedX = x / width;

                // Complex wave composition - multiple frequencies for natural flow
                const wave1 = Math.sin(normalizedX * Math.PI * 2 * line.frequency + animTime * line.speed * 1000 + line.phase) * line.amplitude;
                const wave2 = Math.sin(normalizedX * Math.PI * 2 * line.frequency * 0.5 + animTime * line.speed * 1300 + line.phase * 0.6) * (line.amplitude * 0.35);
                const wave3 = Math.cos(normalizedX * Math.PI * 2 * line.frequency * 1.3 + animTime * line.speed * 700 + line.phase * 1.4) * (line.amplitude * 0.2);

                const y = height * line.yPosition + wave1 + wave2 + wave3;
                points.push({ x, y });
            }

            // Draw the curved line with glow effect
            ctx.save();
            ctx.globalAlpha = line.opacity;
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Apply glow using shadow
            if (line.blur > 0) {
                ctx.shadowColor = line.color;
                ctx.shadowBlur = line.blur;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }

            // Draw smooth bezier curve through all points
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }

            // Final point
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            ctx.stroke();

            // Draw a second pass with stronger glow for more vibrant effect
            ctx.globalAlpha = line.opacity * 0.5;
            ctx.lineWidth = line.lineWidth * 0.5;
            ctx.shadowBlur = line.blur * 2;
            ctx.stroke();

            ctx.restore();
        };

        const animate = () => {
            // Clear with deep black background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Subtle ambient gradient for depth
            const bgGradient = ctx.createRadialGradient(
                width * 0.5,
                height * 0.5,
                0,
                width * 0.5,
                height * 0.5,
                Math.max(width, height) * 0.7
            );
            bgGradient.addColorStop(0, 'rgba(90, 10, 31, 0.06)');
            bgGradient.addColorStop(0.5, 'rgba(60, 5, 20, 0.03)');
            bgGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // Draw all curved lines from back to front (parallax effect)
            waveLines.forEach((line) => {
                drawCurvedLine(line, time);
            });

            // Add subtle ambient glow at center
            const ambientGlow = ctx.createRadialGradient(
                width * 0.5,
                height * 0.55,
                0,
                width * 0.5,
                height * 0.55,
                height * 0.4
            );
            ambientGlow.addColorStop(0, 'rgba(139, 21, 56, 0.08)');
            ambientGlow.addColorStop(0.5, 'rgba(90, 10, 31, 0.04)');
            ambientGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = ambientGlow;
            ctx.fillRect(0, 0, width, height);

            time += 16.67; // ~60fps
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
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
}

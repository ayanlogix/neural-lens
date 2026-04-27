document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('forgeCanvas');
    const ctx = canvas.getContext('2d');
    const layerStack = document.getElementById('layerStack');
    const addLayerBtn = document.getElementById('addLayerBtn');
    const paramCountEl = document.getElementById('paramCount');
    const exportBtn = document.getElementById('exportBtn');

    // 1. Initial State
    let layers = [
        { type: 'input', neurons: 4, label: 'L_00_INPUT' },
        { type: 'hidden', neurons: 8, label: 'L_01_DENSE' },
        { type: 'hidden', neurons: 6, label: 'L_02_DENSE' },
        { type: 'output', neurons: 2, label: 'L_03_OUTPUT' }
    ];

    let pulses = [];
    let particles = [];
    let pulseRate = 0.08; 

    // 2. High-UI Pulse Class (Plasma Ray)
    class PlasmaRay {
        constructor(path) {
            this.path = path; // Array of points along the Bezier curve
            this.progress = 0;
            this.speed = 0.008 + Math.random() * 0.015;
            this.size = 3 + Math.random() * 4;
            this.history = [];
            this.maxHistory = 15;
        }

        update() {
            this.progress += this.speed;
            const index = Math.floor(this.progress * (this.path.length - 1));
            const point = this.path[index];
            
            if (point) {
                this.history.unshift({ x: point.x, y: point.y });
                if (this.history.length > this.maxHistory) this.history.pop();
            }
            
            return this.progress < 1;
        }

        draw(ctx) {
            if (this.history.length < 2) return;

            // Draw Tail (Gradient effect)
            ctx.shadowBlur = 0;
            for (let i = 0; i < this.history.length - 1; i++) {
                const alpha = (1 - i / this.history.length) * 0.8;
                const size = this.size * (1 - i / this.history.length);
                
                ctx.beginPath();
                ctx.arc(this.history[i].x, this.history[i].y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
                ctx.fill();
            }

            // Draw Head (Core Glow)
            const head = this.history[0];
            ctx.beginPath();
            ctx.arc(head.x, head.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#22d3ee';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class Particle {
        constructor(w, h) {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = (Math.random() - 0.5) * 0.2;
            this.size = Math.random() * 1.5;
            this.opacity = Math.random() * 0.3;
        }

        update(w, h) {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0) this.x = w;
            if (this.x > w) this.x = 0;
            if (this.y < 0) this.y = h;
            if (this.y > h) this.y = 0;
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(34, 211, 238, ${this.opacity})`;
            ctx.fill();
        }
    }

    // 3. Helper: Pre-calculate Bezier Path
    const getBezierPath = (x1, y1, x2, y2, segments = 50) => {
        const path = [];
        const cp1x = x1 + (x2 - x1) * 0.5;
        const cp1y = y1 + (Math.random() - 0.5) * 40; // Slight organic curve
        const cp2x = x1 + (x2 - x1) * 0.5;
        const cp2y = y2 + (Math.random() - 0.5) * 40;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const cx = (1 - t) ** 3 * x1 + 3 * (1 - t) ** 2 * t * cp1x + 3 * (1 - t) * t ** 2 * cp2x + t ** 3 * x2;
            const cy = (1 - t) ** 3 * y1 + 3 * (1 - t) ** 2 * t * cp1y + 3 * (1 - t) * t ** 2 * cp2y + t ** 3 * y2;
            path.push({ x: cx, y: cy });
        }
        return path;
    };

    // 4. Rendering Engine
    const render = () => {
        const container = canvas.parentElement;
        if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            particles = Array.from({ length: 80 }, () => new Particle(canvas.width, canvas.height));
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background Particles
        particles.forEach(p => {
            p.update(canvas.width, canvas.height);
            p.draw(ctx);
        });

        const padding = 120;
        const availWidth = canvas.width - padding * 2;
        const availHeight = canvas.height - padding * 2;
        const layerGap = availWidth / (layers.length - 1);

        const coords = layers.map((layer, i) => {
            const x = padding + i * layerGap;
            const neuronGap = availHeight / (layer.neurons + 1);
            return Array.from({ length: layer.neurons }, (_, j) => ({
                x, y: padding + (j + 1) * neuronGap
            }));
        });

        // Connections & Spawning
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
        for (let i = 0; i < coords.length - 1; i++) {
            const currentLayer = coords[i];
            const nextLayer = coords[i + 1];
            currentLayer.forEach(n1 => {
                nextLayer.forEach(n2 => {
                    // Draw Wire (simplified)
                    ctx.beginPath();
                    ctx.moveTo(n1.x, n1.y);
                    ctx.lineTo(n2.x, n2.y);
                    ctx.stroke();

                    // Spawn High-UI Ray
                    if (Math.random() < pulseRate / (currentLayer.length * nextLayer.length)) {
                        const path = getBezierPath(n1.x, n1.y, n2.x, n2.y);
                        pulses.push(new PlasmaRay(path));
                    }
                });
            });
        }

        // Draw Plasma Rays (The High-UI Connectors)
        ctx.globalCompositeOperation = 'lighter';
        pulses = pulses.filter(p => {
            const alive = p.update();
            if (alive) p.draw(ctx);
            return alive;
        });
        ctx.globalCompositeOperation = 'source-over';

        // Draw Nodes (Neuron Cores)
        coords.forEach(layer => {
            layer.forEach(n => {
                ctx.beginPath();
                ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            });
        });

        requestAnimationFrame(render);
    };

    // UI & Logic (Functional maintained)
    const calculateParams = () => {
        let count = 0;
        for (let i = 0; i < layers.length - 1; i++) {
            count += (layers[i].neurons * layers[i+1].neurons) + layers[i+1].neurons;
        }
        paramCountEl.innerText = count.toLocaleString();
    };

    window.adjustUnits = (i, delta) => {
        layers[i].neurons = Math.max(1, Math.min(16, layers[i].neurons + delta));
        updateInterface();
    };

    const updateInterface = () => {
        layerStack.innerHTML = layers.map((layer, i) => `
            <div class="layer-card">
                <span class="layer-tag">${layer.label}</span>
                <div class="neuron-control">
                    <button onclick="window.adjustUnits(${i}, -1)" class="action-btn outline">-</button>
                    <span>${layer.neurons}</span>
                    <button onclick="window.adjustUnits(${i}, 1)" class="action-btn outline">+</button>
                </div>
            </div>
        `).join('');
        calculateParams();
    };

    const runExport = () => {
        const schema = {
            id: `forge_v3_${Date.now()}`,
            layers: layers.map(l => ({ type: l.type, units: l.neurons }))
        };
        const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `plasma_schema_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    addLayerBtn.addEventListener('click', () => {
        if (layers.length >= 6) return;
        layers.splice(layers.length - 1, 0, { type: 'hidden', neurons: 8, label: `L_0${layers.length - 1}_DENSE` });
        updateInterface();
    });

    exportBtn.addEventListener('click', runExport);
    updateInterface();
    requestAnimationFrame(render);
});

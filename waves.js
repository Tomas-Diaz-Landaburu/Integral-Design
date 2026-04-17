(function () {
    'use strict';

    const canvas = document.getElementById('QuienesSomos-waves');
    if (!canvas) return;

    const section = document.getElementById('QuienesSomos');
    if (!section) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ---------------------------------------------------------------
    // Accesibilidad: si el usuario pide menos movimiento, dibujamos
    // un único frame estático y salimos. Evitamos todo el loop.
    // ---------------------------------------------------------------
    const reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------------------------------------------------------------
    // CONFIG
    // ---------------------------------------------------------------
    const CONFIG = {
            numLines: 10,            // de 90 → 45 (la mitad)
            bandHeightRatio: 0.05,   // de 0.22 → 0.08: las líneas nacen MUY juntas en el centro
            amplitudeMin: 45,        // de 48 → 70: más movimiento vertical
            amplitudeMax: 145,       // de 78 → 105
            baseOpacityMin: 0.29,    // subida: menos líneas = cada una aporta más
            baseOpacityMax: 0.28,
            flowSpeed: 0.00240,
            step: 8,
            sinTableSize: 2048
    };

    // ---------------------------------------------------------------
    // LUT de seno con interpolación lineal
    // ---------------------------------------------------------------
    const SIN_SIZE = CONFIG.sinTableSize;
    const SIN_MASK = SIN_SIZE - 1;
    const TWO_PI = Math.PI * 2;
    const HALF_PI = Math.PI * 0.5;
    const SIN_SCALE = SIN_SIZE / TWO_PI;
    const sinTable = new Float32Array(SIN_SIZE);
    for (let i = 0; i < SIN_SIZE; i++) {
        sinTable[i] = Math.sin((i / SIN_SIZE) * TWO_PI);
    }

    function fastSin(x) {
        // Normalizamos a [0, 2π) porque el índice debe ser positivo
        // para que el bitwise OR funcione bien con valores negativos grandes.
        const idx = x * SIN_SCALE;
        const i = idx | 0;
        const frac = idx - i;
        const a = sinTable[i & SIN_MASK];
        const b = sinTable[(i + 1) & SIN_MASK];
        return a + (b - a) * frac;
    }
    function fastCos(x) {
        return fastSin(x + HALF_PI);
    }

    // ---------------------------------------------------------------
    // Estado
    // ---------------------------------------------------------------
    let width = 0, height = 0;
    let time = 0;
    let rafId = null;
    let isVisible = true;
    let lines = [];

    const mouseTarget = { x: -9999, y: -9999, active: false };
    const mouseSmooth = { x: -9999, y: -9999, strength: 0 };

    // ---------------------------------------------------------------
    // Cache global por-X (igual para todas las líneas)
    //   ampModCacheX[i]    = sin(x * 0.0011)
    //   ampModCacheXCos[i] = cos(x * 0.0011)
    // Se usan para reconstruir ampMod sin llamar a sin() por punto.
    // ---------------------------------------------------------------
    let ampModSinX = null;
    let ampModCosX = null;
    let cacheLen = 0;
    let cacheXStart = 0;
    let cacheXEnd = 0;

    // ---------------------------------------------------------------
    // buildLines — crea las líneas y sus caches por-línea
    // ---------------------------------------------------------------
    function buildLines() {
        lines = [];
        const N = CONFIG.numLines;
        const bandHeight = height * CONFIG.bandHeightRatio;
        const step = CONFIG.step;
        const xStart = -20;
        const xEnd = width + 20;
        const len = Math.ceil((xEnd - xStart) / step) + 1;

        for (let i = 0; i < N; i++) {
            const t = i / (N - 1);
            const centeredT = t - 0.5;
            const distribution =
                Math.sign(centeredT) *
                Math.pow(Math.abs(centeredT * 2), 1.1) * 0.5;
            const yOffset = height * 0.5 + distribution * bandHeight;

            const centerWeight = 1 - Math.abs(centeredT) * 0.4;
            const ampBase =
                CONFIG.amplitudeMin +
                (CONFIG.amplitudeMax - CONFIG.amplitudeMin) * Math.random();
            const amplitude = ampBase * (0.85 + centerWeight * 0.25);
            const opacity =
                CONFIG.baseOpacityMin +
                Math.random() *
                    (CONFIG.baseOpacityMax - CONFIG.baseOpacityMin);

            const frequency = 0.0028 + Math.random() * 0.0010;
            const subFreq = 0.0014 + Math.random() * 0.0006;

            // ---- Caches por línea ----
            // sinFX[k] = sin(x_k * frequency)   cosFX[k] = cos(x_k * frequency)
            // sinSX[k] = sin(x_k * subFreq)     cosSX[k] = cos(x_k * subFreq)
            // Con esto, el loop interno no hace NI UN fastSin por punto:
            // todo se arma con la identidad sin(a+b) = sinA·cosB + cosA·sinB
            // usando valores pre-calculados.
            const sinFX = new Float32Array(len);
            const cosFX = new Float32Array(len);
            const sinSX = new Float32Array(len);
            const cosSX = new Float32Array(len);

            let idx = 0;
            for (let x = xStart; x <= xEnd; x += step) {
                const mf = x * frequency;
                const sf = x * subFreq;
                sinFX[idx] = fastSin(mf);
                cosFX[idx] = fastSin(mf + HALF_PI);
                sinSX[idx] = fastSin(sf);
                cosSX[idx] = fastSin(sf + HALF_PI);
                idx++;
            }

            lines.push({
                amplitude: amplitude,
                frequency: frequency,
                phase: i * 0.12 + Math.random() * 0.04,
                speed: CONFIG.flowSpeed + i * 0.00006,
                yOffset: yOffset,
                thickness: 0.5 + Math.random() * 0.4,
                subFreq: subFreq,
                subAmp: 0.22 + Math.random() * 0.14,
                subPhase: Math.random() * TWO_PI,
                mouseReact: 0.55 + Math.random() * 0.9,
                strokeColor: 'rgba(140, 145, 155, ' + opacity.toFixed(3) + ')',
                sinFX: sinFX,
                cosFX: cosFX,
                sinSX: sinSX,
                cosSX: cosSX
            });
        }

        // Cache global de ampMod (depende solo de x · 0.0011, igual para todas)
        ampModSinX = new Float32Array(len);
        ampModCosX = new Float32Array(len);
        let idx = 0;
        for (let x = xStart; x <= xEnd; x += step) {
            const ax = x * 0.0011;
            ampModSinX[idx] = fastSin(ax);
            ampModCosX[idx] = fastSin(ax + HALF_PI);
            idx++;
        }
        cacheLen = len;
        cacheXStart = xStart;
        cacheXEnd = xEnd;
    }

    // ---------------------------------------------------------------
    // resize — con debounce
    // ---------------------------------------------------------------
    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Propiedades de stroke que no cambian frame-a-frame
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        buildLines();
    }

    let resizeTimer = null;
    function debouncedResize() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 150);
    }

    resize();
    window.addEventListener('resize', debouncedResize, { passive: true });

    // ---------------------------------------------------------------
    // Mouse
    // ---------------------------------------------------------------
    section.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        mouseTarget.x = e.clientX - rect.left;
        mouseTarget.y = e.clientY - rect.top;
        mouseTarget.active = true;
    }, { passive: true });

    section.addEventListener('mouseleave', function () {
        mouseTarget.active = false;
    }, { passive: true });

    // ---------------------------------------------------------------
    // Pausa cuando no está en viewport o tab escondida
    // ---------------------------------------------------------------
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function (entries) {
            for (let i = 0; i < entries.length; i++) {
                isVisible = entries[i].isIntersecting;
            }
            if (isVisible && !rafId && !reducedMotion) {
                lastFrameTime = 0; // fuerza render inmediato
                rafId = requestAnimationFrame(draw);
            }
        }, { threshold: 0.01 });
        observer.observe(section);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        } else if (isVisible && !rafId && !reducedMotion) {
            lastFrameTime = 0;
            rafId = requestAnimationFrame(draw);
        }
    });

    // ---------------------------------------------------------------
    // Cap a 30fps
    // ---------------------------------------------------------------
    const TARGET_FPS = 40;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    // ---------------------------------------------------------------
    // DRAW — hot path
    // ---------------------------------------------------------------
    function draw(now) {
        rafId = null;

        if (now - lastFrameTime < FRAME_INTERVAL) {
            if (isVisible && !document.hidden) {
                rafId = requestAnimationFrame(draw);
            }
            return;
        }
        lastFrameTime = now;

        time += 1;

        // ---- Mouse easing ----
        const easePos = 0.035;
        const easeStrength = 0.022;
        if (mouseTarget.active) {
            if (mouseSmooth.x === -9999) {
                mouseSmooth.x = mouseTarget.x;
                mouseSmooth.y = mouseTarget.y;
            } else {
                mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * easePos;
                mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * easePos;
            }
            mouseSmooth.strength += (1 - mouseSmooth.strength) * easeStrength;
        } else {
            mouseSmooth.strength += (0 - mouseSmooth.strength) * easeStrength;
            if (mouseSmooth.strength < 0.005) {
                mouseSmooth.x = -9999;
                mouseSmooth.y = -9999;
            }
        }

        ctx.clearRect(0, 0, width, height);

        const step = CONFIG.step;
        const xStart = cacheXStart;
        const len = cacheLen;
        const tTerm = time * 0.0006;

        // Sincos del término global de ampMod (tTerm)
        const sinT = fastSin(tTerm);
        const cosT = fastCos(tTerm);

        const mouseRadius = Math.max(280, width * 0.22);
        const invMouseRadius = 1 / mouseRadius;
        const mouseActive = mouseSmooth.strength > 0.005;
        const mouseX = mouseSmooth.x;
        const mouseStrength = mouseSmooth.strength;
        const linesLen = lines.length;

        // Alias locales de las caches globales (una sola lectura de propiedad)
        const globSinX = ampModSinX;
        const globCosX = ampModCosX;

        for (let i = 0; i < linesLen; i++) {
            const line = lines[i];
            const amp = line.amplitude;
            const phase = line.phase;
            const yOff = line.yOffset;
            const speedTime = time * line.speed;
            const subPhase = line.subPhase;
            const subAmp = line.subAmp;
            const speedTimeSub = speedTime * 1.3;
            const mouseReactAmp =
                amp * 0.85 * line.mouseReact * mouseStrength;

            // ---- Descomposición de sin(x*freq + speedTime + phase) ----
            // sin(A + B) = sinA·cosB + cosA·sinB
            // A = x*freq (ya cacheado por línea)
            // B = speedTime + phase
            const mainB = speedTime + phase;
            const sinMainB = fastSin(mainB);
            const cosMainB = fastCos(mainB);

            // Igual para sub-wave: sin(x*subFreq + speedTimeSub + subPhase)
            const subB = speedTimeSub + subPhase;
            const sinSubB = fastSin(subB);
            const cosSubB = fastCos(subB);

            // Para ampMod: sin(x*0.0011 + tTerm + phase)
            //           = sin(x*0.0011) · cos(tTerm+phase) +
            //             cos(x*0.0011) · sin(tTerm+phase)
            // Precalculamos sin/cos de (tTerm+phase) usando identidad
            // desde (sinT, cosT) y (sinPhase, cosPhase), sin otra llamada
            // a sin(): sin(T+P) = sinT·cosP + cosT·sinP
            const sinP = fastSin(phase);
            const cosP = fastCos(phase);
            const sinTP = sinT * cosP + cosT * sinP;
            const cosTP = cosT * cosP - sinT * sinP;

            // Arrays cacheados de esta línea
            const sinFX = line.sinFX;
            const cosFX = line.cosFX;
            const sinSX = line.sinSX;
            const cosSX = line.cosSX;

            // Constante precomputada
            const ampSubAmp = amp * subAmp;

            ctx.beginPath();
            ctx.lineWidth = line.thickness;
            ctx.strokeStyle = line.strokeColor;

            // --- Primer punto fuera del loop (evita branch if(first)) ---
            // k = 0, x = xStart
            {
                const k = 0;
                const x0 = xStart;

                const ampModSin = globSinX[k] * cosTP + globCosX[k] * sinTP;
                const ampMod = 1 + ampModSin * 0.18;

                const sinMain = sinFX[k] * cosMainB + cosFX[k] * sinMainB;
                const wave1 = sinMain * amp * ampMod;

                const sinSub = sinSX[k] * cosSubB + cosSX[k] * sinSubB;
                const wave2 = sinSub * ampSubAmp;

                let y = yOff + wave1 + wave2;

                if (mouseActive) {
                    const dx = x0 - mouseX;
                    const absDx = dx < 0 ? -dx : dx;
                    if (absDx < mouseRadius) {
                        const n = 1 - absDx * invMouseRadius;
                        const s = n * n * (3 - 2 * n);
                        y += sinMain * mouseReactAmp * s * s;
                    }
                }

                ctx.moveTo(x0, y);
            }

            // --- Resto de puntos ---
            for (let k = 1; k < len; k++) {
                const x = xStart + k * step;

                // ampMod — cero fastSin
                const ampModSin = globSinX[k] * cosTP + globCosX[k] * sinTP;
                const ampMod = 1 + ampModSin * 0.18;

                // main wave — cero fastSin
                const sinMain = sinFX[k] * cosMainB + cosFX[k] * sinMainB;
                const wave1 = sinMain * amp * ampMod;

                // sub wave — cero fastSin
                const sinSub = sinSX[k] * cosSubB + cosSX[k] * sinSubB;
                const wave2 = sinSub * ampSubAmp;

                let y = yOff + wave1 + wave2;

                if (mouseActive) {
                    const dx = x - mouseX;
                    const absDx = dx < 0 ? -dx : dx;
                    if (absDx < mouseRadius) {
                        const n = 1 - absDx * invMouseRadius;
                        const s = n * n * (3 - 2 * n);
                        // Reutilizamos sinMain (un fastSin menos)
                        y += sinMain * mouseReactAmp * s * s;
                    }
                }

                ctx.lineTo(x, y);
            }

            ctx.stroke();
        }

        if (isVisible && !document.hidden) {
            rafId = requestAnimationFrame(draw);
        }
    }

    // ---------------------------------------------------------------
    // Arranque
    // ---------------------------------------------------------------
    if (reducedMotion) {
        // Un único frame estático (time = 0) para respetar la preferencia
        // del usuario. Sin RAF, sin loops, sin gasto de CPU.
        draw(performance.now());
    } else {
        rafId = requestAnimationFrame(draw);
    }
})();
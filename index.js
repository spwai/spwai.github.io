import { initWebSocket } from './ws-handler.js';

class HierarchicalGraph {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.displayData = [];
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.targetScale = 1;
        this.animationFrame = null;
        this.time = 0;
        this.animationSpeed = 0.02;
        this.lerpSpeed = 0.15;
        this.colors = {
            background: '#0d1117',
            grid1x1: '#2f353d',
            grid16x16: '#3a424a',
            gridMega: '#4a525a',
            gridTerra: '#5a626a',
            dot: '#2f353d',
            target: '#f54254',
            default: '#161c26',
            worker: '#ffffff',
            highlight: '#f54254',
        };
        this.hoverBlock = null;
        this.isDragging = false;
        this.lastDragX = 0;
        this.lastDragY = 0;
        this.focusedIdx = -1;
        this.focusedList = [];
        this.trackingFocused = false;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.cameraLerpSpeed = 0.1;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseEvent = null;
        this.setupCanvas();
        this.setupControls();
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.resize();
        this.animate();
    }

    setupCanvas() {
        this.canvas.style.display = 'block';
        this.canvas.style.background = this.colors.background;
        this.container.appendChild(this.canvas);
    }

    setupControls() {

        ['teleport-btn', 'focus-prev-btn', 'focus-next-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        let btnGroup = document.getElementById('center-btn-group');
        if (!btnGroup) {
            btnGroup = document.createElement('div');
            btnGroup.id = 'center-btn-group';
            btnGroup.style.position = 'fixed';
            btnGroup.style.top = '16px';
            btnGroup.style.left = '16px';
            btnGroup.style.zIndex = 2000;
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '6px';
            document.body.appendChild(btnGroup);
        }

        let centerBtn = document.createElement('button');
        centerBtn.id = 'teleport-btn';
        centerBtn.textContent = 'Center (0,0)';
        centerBtn.style.background = '#21262d';
        centerBtn.style.color = '#fff';
        centerBtn.style.border = '1px solid #30363d';
        centerBtn.style.borderRadius = '6px';
        centerBtn.style.padding = '6px 12px';
        centerBtn.style.cursor = 'pointer';
        centerBtn.style.fontSize = '14px';
        centerBtn.style.userSelect = 'none';
        centerBtn.onclick = () => {
            this.focusedIdx = -1;
            this.centerView();
            this.updateFocusBtns();
        };
        btnGroup.appendChild(centerBtn);

        let prevBtn = document.createElement('button');
        prevBtn.id = 'focus-prev-btn';
        prevBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 15L8 10L13 5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        prevBtn.style.background = '#21262d';
        prevBtn.style.color = '#fff';
        prevBtn.style.border = '1px solid #30363d';
        prevBtn.style.borderRadius = '6px';
        prevBtn.style.padding = '6px';
        prevBtn.style.cursor = 'pointer';
        prevBtn.style.fontSize = '14px';
        prevBtn.style.userSelect = 'none';
        prevBtn.style.display = 'flex';
        prevBtn.style.alignItems = 'center';
        prevBtn.onclick = () => this.focusPrev();
        btnGroup.appendChild(prevBtn);

        let nextBtn = document.createElement('button');
        nextBtn.id = 'focus-next-btn';
        nextBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 5L12 10L7 15" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        nextBtn.style.background = '#21262d';
        nextBtn.style.color = '#fff';
        nextBtn.style.border = '1px solid #30363d';
        nextBtn.style.borderRadius = '6px';
        nextBtn.style.padding = '6px';
        nextBtn.style.cursor = 'pointer';
        nextBtn.style.fontSize = '14px';
        nextBtn.style.userSelect = 'none';
        nextBtn.style.display = 'flex';
        nextBtn.style.alignItems = 'center';
        nextBtn.onclick = () => this.focusNext();
        btnGroup.appendChild(nextBtn);
        this.updateFocusBtns();
    }

    updateFocusBtns() {
        const prevBtn = document.getElementById('focus-prev-btn');
        const nextBtn = document.getElementById('focus-next-btn');
        this.focusedList = (this.data || []).filter(p => p.flags === 'worker' || p.flags === 'target');
        const hasFocus = this.focusedList.length > 0;
        prevBtn.disabled = !hasFocus;
        nextBtn.disabled = !hasFocus;
        prevBtn.style.opacity = hasFocus ? '1' : '0.5';
        nextBtn.style.opacity = hasFocus ? '1' : '0.5';
    }

    focusPrev() {
        this.focusedList = (this.data || []).filter(p => p.flags === 'worker' || p.flags === 'target');
        if (!this.focusedList.length) return;
        if (this.focusedIdx === -1) this.focusedIdx = 0;
        else this.focusedIdx = (this.focusedIdx - 1 + this.focusedList.length) % this.focusedList.length;
        this.trackingFocused = true;
        this.centerOnFocused();
        this.updateFocusBtns();
    }

    focusNext() {
        this.focusedList = (this.data || []).filter(p => p.flags === 'worker' || p.flags === 'target');
        if (!this.focusedList.length) return;
        if (this.focusedIdx === -1) this.focusedIdx = 0;
        else this.focusedIdx = (this.focusedIdx + 1) % this.focusedList.length;
        this.trackingFocused = true;
        this.centerOnFocused();
        this.updateFocusBtns();
    }

    centerOnFocused() {
        if (this.focusedIdx === -1 || !this.focusedList.length) return;
        const p = this.focusedList[this.focusedIdx];
        if (!this.trackingFocused) {
            this.targetScale = Math.min(
                (this.canvas.width - 100) / 256,
                (this.canvas.height - 100) / 256
            );
        }
        this.targetOffsetX = (this.canvas.width / 2) / this.targetScale - p.position.x;
        this.targetOffsetY = (this.canvas.height / 2) / this.targetScale + p.position.z;
        if (!this.trackingFocused) {
            this.scale = this.targetScale;
            this.offsetX = this.targetOffsetX;
            this.offsetY = this.targetOffsetY;
        }
        this.render();
    }

    centerView() {
        this.targetScale = Math.min(
            (this.canvas.width - 100) / 256,
            (this.canvas.height - 100) / 256
        );
        this.targetOffsetX = (this.canvas.width / 2) / this.targetScale;
        this.targetOffsetY = (this.canvas.height / 2) / this.targetScale;
        this.scale = this.targetScale;
        this.offsetX = this.targetOffsetX;
        this.offsetY = this.targetOffsetY;
        this.trackingFocused = false;
        this.render();
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
        this.hideCoordPopup();
        this.hoverBlock = null;
        this.lastMouseEvent = null;
        if (this.trackingFocused) {
            this.targetOffsetX = this.offsetX;
            this.targetOffsetY = this.offsetY;
            this.targetScale = this.scale;
            this.trackingFocused = false;
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const dx = (e.clientX - this.lastDragX) / this.scale;
            const dz = (e.clientY - this.lastDragY) / this.scale;
            this.offsetX += dx;
            this.offsetY += dz;
            this.lastDragX = e.clientX;
            this.lastDragY = e.clientY;
            this.render();
            return;
        }
        this.lastMouseEvent = e;
        this.mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
        this.mouseY = e.clientY - this.canvas.getBoundingClientRect().top;
        this.updateHoverAndPopup();
    }

    updateHoverAndPopup() {
        if (!this.lastMouseEvent) return;

        const x = Math.floor(this.mouseX / this.scale - this.offsetX);
        const z = Math.floor(-(this.mouseY / this.scale - this.offsetY));
        this.hoverBlock = { x, z };

        let popup = document.getElementById('coord-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'coord-popup';
            popup.style.position = 'fixed';
            popup.style.background = '#161b22';
            popup.style.color = '#fff';
            popup.style.fontSize = '13px';
            popup.style.fontFamily = 'monospace';
            popup.style.padding = '8px 14px';
            popup.style.borderRadius = '8px';
            popup.style.border = '1px solid #30363d';
            popup.style.zIndex = 9999;
            popup.style.pointerEvents = 'none';
            popup.style.maxWidth = '300px';
            popup.style.whiteSpace = 'nowrap';
            document.body.appendChild(popup);
        }

        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        popup.innerHTML = `Block (<b>${x}</b>, <b>${z}</b>)<br>Chunk (<b>${chunkX}</b>, <b>${chunkZ}</b>)`;

        const mouseX = this.lastMouseEvent.clientX;
        const mouseY = this.lastMouseEvent.clientY;
        popup.style.left = `${mouseX + 20}px`;
        popup.style.top = `${mouseY + 20}px`;
        popup.style.display = 'block';

        const popupRect = popup.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (popupRect.right > viewportWidth) {
            popup.style.left = `${viewportWidth - popupRect.width - 10}px`;
        }
        if (popupRect.bottom > viewportHeight) {
            popup.style.top = `${viewportHeight - popupRect.height - 10}px`;
        }
    }

    handleMouseLeave() {
        this.hoverBlock = null;
        this.lastMouseEvent = null;
        this.hideCoordPopup();
    }

    handleWheel(e) {
        e.preventDefault();
        const scaleFactor = 1.1;
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
        const worldX = mouseX / this.scale - this.offsetX;
        const worldZ = -(mouseY / this.scale - this.offsetY);

        if (e.deltaY < 0) {
            this.targetScale *= scaleFactor;
        } else {
            this.targetScale /= scaleFactor;
        }

        if (!this.trackingFocused) {
            this.scale = this.targetScale;
            this.offsetX = (mouseX / this.scale) - worldX;
            this.offsetY = (mouseY / this.scale) + worldZ;
        }

        this.render();
    }

    resize() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        if (!this.data || this.data.length === 0) {
            this.centerView();
        }
        this.render();
    }

    setData(data) {
        this.data = data.map(p => ({ ...p, position: { ...p.position } }));
        if (!this.displayData.length) {
            this.displayData = this.data.map(p => ({ ...p, position: { ...p.position } }));
        }
        this.focusedList = (this.data || []).filter(p => p.flags === 'worker' || p.flags === 'target');
        if (this.focusedIdx >= this.focusedList.length) {
            this.focusedIdx = -1;
            this.trackingFocused = false;
        }
        this.updateFocusBtns();
    }

    animate() {
        this.time += this.animationSpeed;
        this.smoothDisplayData();

        if (this.trackingFocused && this.focusedIdx !== -1 && this.focusedList.length) {
            const p = this.focusedList[this.focusedIdx];
            this.targetOffsetX = (this.canvas.width / 2) / this.targetScale - p.position.x;
            this.targetOffsetY = (this.canvas.height / 2) / this.targetScale + p.position.z;

            this.scale += (this.targetScale - this.scale) * this.cameraLerpSpeed;
            this.offsetX += (this.targetOffsetX - this.offsetX) * this.cameraLerpSpeed;
            this.offsetY += (this.targetOffsetY - this.offsetY) * this.cameraLerpSpeed;
        }

        if (this.lastMouseEvent) {
            this.updateHoverAndPopup();
        }

        this.render();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    smoothDisplayData() {
        if (!this.data.length) return;
        if (!this.displayData.length) {
            this.displayData = this.data.map(p => ({ ...p, position: { ...p.position } }));
            return;
        }
        this.data.forEach((newP) => {
            let matchIdx = this.displayData.findIndex(d => d.id === newP.id);
            if (matchIdx === -1) {
                this.displayData.push({ ...newP, position: { ...newP.position } });
            } else {
                let disp = this.displayData[matchIdx];
                disp.position.x += (newP.position.x - disp.position.x) * this.lerpSpeed;
                disp.position.z += (newP.position.z - disp.position.z) * this.lerpSpeed;
                disp.flags = newP.flags;
            }
        });
        this.displayData = this.displayData.filter(d => this.data.find(n => n.id === d.id));
    }

    hideCoordPopup() {
        const popup = document.getElementById('coord-popup');
        if (popup) popup.style.display = 'none';
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const visibleLeft = -this.offsetX;
        const visibleRight = (this.canvas.width / this.scale) - this.offsetX;
        const visibleTop = -this.offsetY;
        const visibleBottom = (this.canvas.height / this.scale) - this.offsetY;
        this.drawGrid(visibleLeft, visibleRight, visibleTop, visibleBottom);
        this.drawPoints();
        this.drawHoverBlock();
    }

    drawHoverBlock() {
        if (!this.hoverBlock) return;
        const { x, z } = this.hoverBlock;
        this.ctx.save();
        this.ctx.strokeStyle = this.colors.highlight;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.8;
        this.ctx.strokeRect(
            (x + this.offsetX) * this.scale,
            (-z + this.offsetY) * this.scale,
            this.scale,
            this.scale
        );
        this.ctx.restore();
    }

    drawGrid(left, right, top, bottom) {
        left -= 1000; right += 1000; top -= 1000; bottom += 1000;
        const levels = this.getDynamicGridLevels();
        const thresholdPx = 32;
        let idx = 0;
        for (let i = 0; i < levels.length; i++) {
            if (levels[i] * this.scale >= thresholdPx) {
                idx = i;
                break;
            }
        }
        let blend = 0;
        if (idx > 0) {
            const prevPx = levels[idx - 1] * this.scale;
            const currPx = levels[idx] * this.scale;
            blend = Math.min(1, Math.max(0, (thresholdPx - prevPx) / (currPx - prevPx)));
        }
        if (idx > 0) {
            this.drawGridLevel(left, right, top, bottom, levels[idx - 1], this.getGridColor(idx - 1), Math.min(idx, 4), 0.2 * (1 - blend));
        }
        for (let j = 0; j < 4 && idx + j < levels.length; j++) {
            let alpha = 0.9 - j * 0.2;
            if (j === 0 && idx > 0) alpha *= blend;
            this.drawGridLevel(left, right, top, bottom, levels[idx + j], this.getGridColor(idx + j), Math.min(idx + j + 1, 4), Math.max(0.2, alpha));
        }
    }

    getDynamicGridLevels() {
        const levels = [1];
        let size = 1;
        const maxPx = Math.max(this.canvas.width, this.canvas.height) * 2;
        while (size * 16 < maxPx / this.scale) {
            size *= 16;
            levels.push(size);
        }
        return levels;
    }

    getGridColor(levelIdx) {
        const palette = [
            this.colors.grid1x1,
            this.colors.grid16x16,
            this.colors.gridMega,
            this.colors.gridTerra
        ];
        if (levelIdx < palette.length) return palette[levelIdx];
        const t = Math.min(1, (levelIdx - 3) / 8);
        const lerp = (a, b) => Math.round(a + (b - a) * t);
        const r = lerp(90, 255);
        const g = lerp(98, 255);
        const b = lerp(106, 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    drawGridLevel(left, right, top, bottom, gridSize, color, lineWidth, alpha = 1) {
        this.ctx.strokeStyle = color;
        let scaledLineWidth = lineWidth / this.scale;
        scaledLineWidth = Math.max(0.1, Math.min(1.5, scaledLineWidth));
        this.ctx.lineWidth = scaledLineWidth;
        this.ctx.globalAlpha = alpha;

        const minScreenX = 0;
        const maxScreenX = this.canvas.width;
        const minWorldX = minScreenX / this.scale - this.offsetX;
        const maxWorldX = maxScreenX / this.scale - this.offsetX;
        const startX = Math.floor(minWorldX / gridSize) * gridSize;
        const endX = Math.ceil(maxWorldX / gridSize) * gridSize;
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(
                (x + this.offsetX) * this.scale,
                0
            );
            this.ctx.lineTo(
                (x + this.offsetX) * this.scale,
                this.canvas.height
            );
            this.ctx.stroke();
        }

        const minScreenY = 0;
        const maxScreenY = this.canvas.height;
        const minWorldZ = -(maxScreenY / this.scale - this.offsetY);
        const maxWorldZ = -(minScreenY / this.scale - this.offsetY);
        const startZ = Math.floor(minWorldZ / gridSize) * gridSize;
        const endZ = Math.ceil(maxWorldZ / gridSize) * gridSize;
        for (let z = startZ; z <= endZ; z += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(
                0,
                (-z + this.offsetY) * this.scale
            );
            this.ctx.lineTo(
                this.canvas.width,
                (-z + this.offsetY) * this.scale
            );
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1;
    }

    drawPoints() {
        const sortedPoints = [...this.displayData].sort((a, b) => {
            const getPriority = (flags) => {
                switch (flags) {
                    case 'target': return 4;
                    case 'worker': return 3;
                    case 'default': return 2;
                    default: return 1;
                }
            };
            return getPriority(a.flags) - getPriority(b.flags);
        });

        sortedPoints.forEach(point => {
            const screenX = (point.position.x + this.offsetX) * this.scale;
            const screenY = (-point.position.z + this.offsetY) * this.scale;

            if (screenX < -10 || screenX > this.canvas.width + 10 ||
                screenY < -10 || screenY > this.canvas.height + 10) {
                return;
            }

            let color = this.colors.dot;
            if (point.flags === 'target') {
                color = this.colors.target;
            } else if (point.flags === 'worker') {
                color = this.colors.worker;
            } else if (point.flags === 'default') {
                color = this.colors.default;
            }

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = this.colors.background;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.canvas.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const graph = new HierarchicalGraph('graph-container');
    window.graph = graph;
    initWebSocket(graph);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HierarchicalGraph;
}
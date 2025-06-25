import { initWebSocket } from './ws-handler.js';

class HierarchicalGraph {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.displayData = [];
        this.allData = [];
        this.currentAddress = 'all';
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
        this.lastTouchDistance = 0;
        this.selectedPointId = null;
        this.selectedPoints = new Set();
        this.iconClickRadius = 16;
        this.lastDataTime = 0;
        this.dataTimeout = 5000;
        this.isSelecting = false;
        this.selectionStart = { x: 0, y: 0 };
        this.selectionEnd = { x: 0, y: 0 };
        this.infoPanels = new Map();
        this.isMobile = window.innerWidth <= 768;
        this.setupCanvas();
        this.setupControls();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('resize', () => this.updateMobileState());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('click', (e) => this.handleIconClick(e));
        this.resize();
        this.animate();

        // Address dropdown event listener
        const dropdown = document.getElementById('address-dropdown');
        if (dropdown) {
            dropdown.addEventListener('change', (e) => {
                this.currentAddress = e.target.value;
                this.filterDataByAddress();
                this.focusedList = (this.data || []).filter(p => p.flags === 'worker' || p.flags === 'target');
                this.updateFocusBtns();
            });
        }
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
            btnGroup.style.gap = '8px';
            btnGroup.style.transform = 'scale(1)';
            btnGroup.style.transformOrigin = 'left top';
            document.body.appendChild(btnGroup);
        }

        let centerBtn = document.createElement('button');
        centerBtn.id = 'teleport-btn';
        centerBtn.textContent = 'Center (0,0)';
        centerBtn.style.background = '#21262d';
        centerBtn.style.color = '#fff';
        centerBtn.style.border = '1px solid #30363d';
        centerBtn.style.borderRadius = '6px';
        centerBtn.style.padding = '8px 16px';
        centerBtn.style.cursor = 'pointer';
        centerBtn.style.fontSize = '14px';
        centerBtn.style.userSelect = 'none';
        centerBtn.style.minWidth = '100px';
        centerBtn.style.height = '36px';
        centerBtn.style.touchAction = 'manipulation';
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
        prevBtn.style.width = '36px';
        prevBtn.style.height = '36px';
        prevBtn.style.cursor = 'pointer';
        prevBtn.style.fontSize = '14px';
        prevBtn.style.userSelect = 'none';
        prevBtn.style.display = 'flex';
        prevBtn.style.alignItems = 'center';
        prevBtn.style.justifyContent = 'center';
        prevBtn.style.touchAction = 'manipulation';
        prevBtn.onclick = () => this.focusPrev();
        btnGroup.appendChild(prevBtn);

        let nextBtn = document.createElement('button');
        nextBtn.id = 'focus-next-btn';
        nextBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 5L12 10L7 15" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        nextBtn.style.background = '#21262d';
        nextBtn.style.color = '#fff';
        nextBtn.style.border = '1px solid #30363d';
        nextBtn.style.borderRadius = '6px';
        nextBtn.style.width = '36px';
        nextBtn.style.height = '36px';
        nextBtn.style.cursor = 'pointer';
        nextBtn.style.fontSize = '14px';
        nextBtn.style.userSelect = 'none';
        nextBtn.style.display = 'flex';
        nextBtn.style.alignItems = 'center';
        nextBtn.style.justifyContent = 'center';
        nextBtn.style.touchAction = 'manipulation';
        nextBtn.onclick = () => this.focusNext();
        btnGroup.appendChild(nextBtn);
        this.updateFocusBtns();
        this.setupLegendToggle();
    }

    setupLegendToggle() {
        const toggleBtn = document.getElementById('legend-toggle');
        const legendContent = document.getElementById('legend-content');
        const legend = document.querySelector('.legend');
        const controlsPC = document.getElementById('legend-controls-pc');
        const controlsMobile = document.getElementById('legend-controls-mobile');

        if (toggleBtn && legendContent && legend) {
            const isMobile = window.innerWidth <= 768;
            if (controlsPC && controlsMobile) {
                controlsPC.style.display = isMobile ? 'none' : 'block';
                controlsMobile.style.display = isMobile ? 'block' : 'none';
            }
            window.addEventListener('resize', () => {
                const isMobileNow = window.innerWidth <= 768;
                if (controlsPC && controlsMobile) {
                    controlsPC.style.display = isMobileNow ? 'none' : 'block';
                    controlsMobile.style.display = isMobileNow ? 'block' : 'none';
                }
            });
            toggleBtn.addEventListener('mouseenter', () => {
                toggleBtn.style.background = '#30363d';
                toggleBtn.style.borderColor = '#8b949e';
            });

            toggleBtn.addEventListener('mouseleave', () => {
                toggleBtn.style.background = '#21262d';
                toggleBtn.style.borderColor = '#30363d';
            });

            toggleBtn.onclick = () => {
                const isCollapsed = legend.classList.contains('legend-collapsed');
                if (isCollapsed) {
                    legend.classList.remove('legend-collapsed');
                    legendContent.style.maxHeight = 'none';
                    legendContent.style.overflow = 'visible';
                    toggleBtn.classList.remove('collapsed');
                } else {
                    legend.classList.add('legend-collapsed');
                    legendContent.style.maxHeight = '0px';
                    legendContent.style.overflow = 'hidden';
                    toggleBtn.classList.add('collapsed');
                }
                setTimeout(() => {
                    this.updateInfoPanelPositions();
                }, 10);
            };
        }
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
        this.selectedPointId = null;
        this.selectedPoints.clear();
        this.clearAllInfoPanels();
        const p = this.focusedList[this.focusedIdx];
        if (p) {
            this.selectedPointId = p.id;
            this.showInfoPopup(p);
        }
    }

    focusNext() {
        this.focusedList = (this.data || []).filter(p => p.flags === 'worker' || p.flags === 'target');
        if (!this.focusedList.length) return;
        if (this.focusedIdx === -1) this.focusedIdx = 0;
        else this.focusedIdx = (this.focusedIdx + 1) % this.focusedList.length;
        this.trackingFocused = true;
        this.centerOnFocused();
        this.updateFocusBtns();
        this.selectedPointId = null;
        this.selectedPoints.clear();
        this.clearAllInfoPanels();
        const p = this.focusedList[this.focusedIdx];
        if (p) {
            this.selectedPointId = p.id;
            this.showInfoPopup(p);
        }
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
        if (e.button === 1 || e.button === 2) {
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
        } else if (e.button === 0 && !this.isMobile) {
            this.isSelecting = true;
            const rect = this.canvas.getBoundingClientRect();
            this.selectionStart = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.selectionEnd = { ...this.selectionStart };
        }
    }

    handleMouseUp(e) {
        if (e.button === 1 || e.button === 2) {
            this.isDragging = false;
        } else if (e.button === 0 && this.isSelecting && !this.isMobile) {
            this.isSelecting = false;
            this.finalizeSelection();
        }
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const dx = (e.clientX - this.lastDragX) / this.scale;
            const dz = (e.clientY - this.lastDragY) / this.scale;
            if (Math.abs(dx) > 0.5 || Math.abs(dz) > 0.5) {
                if (this.trackingFocused) {
                    this.targetOffsetX = this.offsetX;
                    this.targetOffsetY = this.offsetY;
                    this.targetScale = this.scale;
                    this.trackingFocused = false;
                }
            }
            this.offsetX += dx;
            this.offsetY += dz;
            this.lastDragX = e.clientX;
            this.lastDragY = e.clientY;
            this.render();
            return;
        }
        if (this.isSelecting && !this.isMobile) {
            const rect = this.canvas.getBoundingClientRect();
            this.selectionEnd = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.render();
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

        let mouseX = this.lastMouseEvent.clientX;
        let mouseY = this.lastMouseEvent.clientY;
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

        const legend = document.querySelector('.legend');
        const infoPopup = document.getElementById('icon-info-popup');
        const checkCollision = (rect1, rect2) => {
            return rect1.left < rect2.right &&
                rect1.right > rect2.left &&
                rect1.top < rect2.bottom &&
                rect1.bottom > rect2.top;
        };
        let newRect = popup.getBoundingClientRect();
        if (legend) {
            const legendRect = legend.getBoundingClientRect();
            if (checkCollision(newRect, legendRect)) {
                popup.style.top = `${legendRect.top - newRect.height - 8}px`;
                newRect = popup.getBoundingClientRect();
                if (checkCollision(newRect, legendRect)) {
                    popup.style.left = `${legendRect.left - newRect.width - 8}px`;
                }
            }
        }
        if (infoPopup) {
            const infoRect = infoPopup.getBoundingClientRect();
            newRect = popup.getBoundingClientRect();
            if (checkCollision(newRect, infoRect)) {
                popup.style.top = `${infoRect.top - newRect.height - 8}px`;
                newRect = popup.getBoundingClientRect();
                if (checkCollision(newRect, infoRect)) {
                    popup.style.left = `${infoRect.left - newRect.width - 8}px`;
                }
            }
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

    handleTouchStart(e) {
        e.preventDefault();
        this.isDragging = true;
        if (e.touches.length === 1) {
            this.lastDragX = e.touches[0].clientX;
            this.lastDragY = e.touches[0].clientY;
            const rect = this.canvas.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            const touchY = e.touches[0].clientY - rect.top;
            let found = null;
            for (const point of this.displayData) {
                const screenX = (point.position.x + this.offsetX) * this.scale;
                const screenY = (-point.position.z + this.offsetY) * this.scale;
                const dx = touchX - screenX;
                const dy = touchY - screenY;
                if (Math.sqrt(dx * dx + dy * dy) <= this.iconClickRadius) {
                    found = point;
                    break;
                }
            }
            if (found) {
                if (this.selectedPointId === found.id) {
                    this.selectedPointId = null;
                    this.hideInfoPopup();
                } else {
                    this.selectedPointId = found.id;
                    this.showInfoPopup(found);
                }
            }
        } else if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.lastTouchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDragging) return;

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const dx = (touch.clientX - this.lastDragX) / this.scale;
            const dz = (touch.clientY - this.lastDragY) / this.scale;
            if (Math.abs(dx) > 0.5 || Math.abs(dz) > 0.5) {
                if (this.trackingFocused) {
                    this.targetOffsetX = this.offsetX;
                    this.targetOffsetY = this.offsetY;
                    this.targetScale = this.scale;
                    this.trackingFocused = false;
                }
            }
            this.offsetX += dx;
            this.offsetY += dz;
            this.lastDragX = touch.clientX;
            this.lastDragY = touch.clientY;
        } else if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            if (this.lastTouchDistance) {
                const scaleFactor = currentDistance / this.lastTouchDistance;
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                const rect = this.canvas.getBoundingClientRect();
                const worldX = (centerX - rect.left) / this.scale - this.offsetX;
                const worldZ = -((centerY - rect.top) / this.scale - this.offsetY);

                this.targetScale *= scaleFactor;
                if (!this.trackingFocused) {
                    this.scale = this.targetScale;
                    this.offsetX = ((centerX - rect.left) / this.scale) - worldX;
                    this.offsetY = ((centerY - rect.top) / this.scale) + worldZ;
                }
            }
            this.lastTouchDistance = currentDistance;
        }
        this.render();
    }

    handleTouchEnd(e) {
        this.isDragging = false;
        this.lastTouchDistance = 0;
    }

    handleIconClick(e) {
        if ((e.ctrlKey || e.metaKey) && !this.isMobile) {
            this.handleMultiSelection(e);
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        let found = null;
        for (const point of this.displayData) {
            const screenX = (point.position.x + this.offsetX) * this.scale;
            const screenY = (-point.position.z + this.offsetY) * this.scale;
            const dx = mouseX - screenX;
            const dy = mouseY - screenY;
            if (Math.sqrt(dx * dx + dy * dy) <= this.iconClickRadius) {
                found = point;
                break;
            }
        }
        if (found) {
            if (this.selectedPointId === found.id) {
                this.selectedPointId = null;
                this.selectedPoints.clear();
                this.clearAllInfoPanels();
            } else {
                this.selectedPointId = found.id;
                this.selectedPoints.clear();
                this.selectedPoints.add(found.id);
                this.clearAllInfoPanels();
                this.showInfoPopup(found);
            }
        }
    }

    handleMultiSelection(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        let found = null;
        for (const point of this.displayData) {
            const screenX = (point.position.x + this.offsetX) * this.scale;
            const screenY = (-point.position.z + this.offsetY) * this.scale;
            const dx = mouseX - screenX;
            const dy = mouseY - screenY;
            if (Math.sqrt(dx * dx + dy * dy) <= this.iconClickRadius) {
                found = point;
                break;
            }
        }
        if (found) {
            if (this.selectedPoints.has(found.id)) {
                this.selectedPoints.delete(found.id);
                this.removeInfoPanel(found.id);
                if (this.selectedPoints.size > 0) {
                    this.selectedPointId = Array.from(this.selectedPoints)[0];
                } else {
                    this.selectedPointId = null;
                }
            } else {
                this.selectedPoints.add(found.id);
                this.selectedPointId = found.id;
                this.showInfoPopup(found);
            }
        }
    }

    finalizeSelection() {
        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);

        const selectionWidth = endX - startX;
        const selectionHeight = endY - startY;
        const minSelectionSize = 10;

        if (selectionWidth < minSelectionSize && selectionHeight < minSelectionSize) {
            this.isSelecting = false;
            return;
        }

        this.selectedPoints.clear();
        this.clearAllInfoPanels();

        for (const point of this.displayData) {
            const screenX = (point.position.x + this.offsetX) * this.scale;
            const screenY = (-point.position.z + this.offsetY) * this.scale;

            if (screenX >= startX && screenX <= endX && screenY >= startY && screenY <= endY) {
                this.selectedPoints.add(point.id);
            }
        }

        if (this.selectedPoints.size > 0) {
            this.selectedPoints.forEach(pointId => {
                const point = this.displayData.find(p => p.id === pointId);
                if (point) {
                    this.showInfoPopup(point);
                }
            });
            this.selectedPointId = Array.from(this.selectedPoints)[0];
        }
    }

    showInfoPopup(point) {
        if (this.isMobile) {
            this.clearAllInfoPanels();
            this.selectedPoints.clear();
            this.selectedPoints.add(point.id);
        }
        let popup = document.getElementById(`icon-info-popup-${point.id}`);
        if (!popup) {
            popup = document.createElement('div');
            popup.id = `icon-info-popup-${point.id}`;
            popup.style.position = 'fixed';
            popup.style.background = '#161b22';
            popup.style.color = '#fff';
            popup.style.fontSize = 'min(13px, 3.5vw)';
            popup.style.fontFamily = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
            popup.style.padding = '12px 8px 12px 8px';
            popup.style.borderRadius = '8px';
            popup.style.border = '1px solid #30363d';
            popup.style.zIndex = 10001;
            popup.style.pointerEvents = 'auto';
            popup.style.whiteSpace = 'normal';
            popup.style.display = 'block';
            popup.style.overflow = 'hidden';
            popup.style.fontWeight = '300';
            popup.style.textAlign = 'left';
            popup.style.wordBreak = 'break-word';
            popup.style.maxWidth = '260px';
            popup.style.minWidth = '150px';
            popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        }

        const legend = document.querySelector('.legend');
        if (legend) {
            popup.style.width = getComputedStyle(legend).width;
        } else {
            popup.style.width = '260px';
        }

        const fmt = v => (v === undefined || v === null || isNaN(v) ? '?' : Math.round(v));
        const fmtF = v => (v === undefined || v === null || isNaN(v) ? '?' : v.toFixed(2));
        const isMobile = window.innerWidth <= 768;
        const pos = point.position || {};
        const vel = point.velocity || {};
        const head = point.head || {};
        const aabb = point.aabb || {};
        const meta = point.metadata || {};
        let metaHurtDir = meta['hurt-direction'] || {};
        let metaHurtTime = meta['hurt-time'];
        popup.innerHTML = `
            <b>Name:</b> ${point.name || ''}<br>
            <b>Type:</b> ${point.type || ''}<br>
            <b>XYZ:</b> <b>${fmt(pos.x)}</b>, <b>${fmt(pos.y)}</b>, <b>${fmt(pos.z)}</b><br>
            <b>Velocity:</b> <b>${fmtF(vel.x)}</b>, <b>${fmtF(vel.y)}</b>, <b>${fmtF(vel.z)}</b><br>
            <b>Head:</b> <b>${fmt(head.pitch)}</b>, <b>${fmt(head.yaw)}</b>, <b>${fmt(head.head_yaw)}</b><br>
            <b>AABB:</b><b>${aabb.height ?? '?'}</b>, <b>${aabb.width ?? '?'}</b>, <b>${aabb.scale ?? '?'}</b><br>
            <b>Flags:</b> <b>${point.flags}</b><br>
            <b>Address:</b> <b>${point.address}</b><br>
            <b>ID:</b> <b>${point.id}</b><br>
            <b>Hurt Time:</b> <b>${metaHurtTime ?? '?'}</b><br>
            <b>Hurt Dir:</b> <b>${fmtF(metaHurtDir.x)}</b>, <b>${fmtF(metaHurtDir.y)}</b>, <b>${fmtF(metaHurtDir.z)}</b>
        `;

        this.infoPanels.set(point.id, popup);
        this.updateInfoPanelPositions();
        document.body.appendChild(popup);
    }

    hideInfoPopup() {
        this.clearAllInfoPanels();
    }

    removeInfoPanel(pointId) {
        const popup = document.getElementById(`icon-info-popup-${pointId}`);
        if (popup) {
            popup.remove();
            this.infoPanels.delete(pointId);
        }
    }

    clearAllInfoPanels() {
        this.infoPanels.forEach((popup, id) => {
            popup.remove();
        });
        this.infoPanels.clear();
    }

    updateInfoPanelPositions() {
        const legend = document.querySelector('.legend');
        if (!legend) return;

        const legendRect = legend.getBoundingClientRect();
        const panelWidth = getComputedStyle(legend).width;
        const spacing = 10;
        const scrollY = window.scrollY || window.pageYOffset;

        let currentY = legendRect.top + scrollY - spacing;

        const panels = Array.from(this.infoPanels.values()).reverse();
        panels.forEach((popup, idx) => {
            popup.style.position = 'absolute';
            popup.style.left = `${legendRect.left}px`;
            popup.style.width = panelWidth;
            popup.style.zIndex = 10001;
            popup.style.top = '0px';
            const panelHeight = popup.offsetHeight;
            currentY -= panelHeight;
            popup.style.top = `${currentY}px`;
            if (parseInt(popup.style.top) < 25) {
                popup.style.top = '25px';
            }
            currentY -= spacing;
        });
    }

    updateInfoPopup() {
        this.infoPanels.forEach((popup, pointId) => {
            const point = this.displayData.find(p => p.id === pointId);
            if (!point) {
                this.removeInfoPanel(pointId);
                return;
            }

            const legend = document.querySelector('.legend');
            if (legend) {
                popup.style.width = getComputedStyle(legend).width;
            }

            const fmt = v => (v === undefined || v === null || isNaN(v) ? '?' : Math.round(v));
            const fmtF = v => (v === undefined || v === null || isNaN(v) ? '?' : v.toFixed(2));
            const isMobile = window.innerWidth <= 768;
            const pos = point.position || {};
            const vel = point.velocity || {};
            const head = point.head || {};
            const aabb = point.aabb || {};
            const meta = point.metadata || {};
            let metaHurtDir = meta['hurt-direction'] || {};
            let metaHurtTime = meta['hurt-time'];
            popup.innerHTML = `
                <b>Name:</b> ${point.name || ''}<br>
                <b>Type:</b> ${point.type || ''}<br>
                <b>XYZ:</b> <b>${fmt(pos.x)}</b>, <b>${fmt(pos.y)}</b>, <b>${fmt(pos.z)}</b><br>
                <b>Velocity:</b> <b>${fmtF(vel.x)}</b>, <b>${fmtF(vel.y)}</b>, <b>${fmtF(vel.z)}</b><br>
                <b>Head:</b> <b>${fmt(head.pitch)}</b>, <b>${fmt(head.yaw)}</b>, <b>${fmt(head.head_yaw)}</b><br>
                <b>AABB:</b><b>${aabb.height ?? '?'}</b>, <b>${aabb.width ?? '?'}</b>, <b>${aabb.scale ?? '?'}</b><br>
                <b>Flags:</b> <b>${point.flags}</b><br>
                <b>Address:</b> <b>${point.address}</b><br>
                <b>ID:</b> <b>${point.id}</b><br>
                <b>Hurt Time:</b> <b>${metaHurtTime ?? '?'}</b><br>
                <b>Hurt Dir:</b> <b>${fmtF(metaHurtDir.x)}</b>, <b>${fmtF(metaHurtDir.y)}</b>, <b>${fmtF(metaHurtDir.z)}</b>
            `;
        });

        this.updateInfoPanelPositions();
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
        this.allData = data.map(p => ({ ...p, position: { ...p.position }, address: p.address }));
        this.updateAddressDropdown();
        this.filterDataByAddress();
        this.focusedList = (this.data || []).filter(p => p.flags === 'worker' || p.flags === 'target');
        if (this.focusedIdx >= this.focusedList.length) {
            this.focusedIdx = -1;
            this.trackingFocused = false;
        }
        this.updateFocusBtns();
    }

    filterDataByAddress() {
        if (this.currentAddress === 'all') {
            this.data = this.allData;
        } else {
            this.data = this.allData.filter(p => p.address === this.currentAddress);
        }
        if (!this.displayData.length) {
            this.displayData = this.data.map(p => ({ ...p, position: { ...p.position } }));
        }
    }

    updateAddressDropdown() {
        const dropdown = document.getElementById('address-dropdown');
        if (!dropdown) return;
        dropdown.style.width = 'calc(100% - 2px)';
        dropdown.style.height = '36px';
        dropdown.style.background = '#21262d';
        dropdown.style.color = '#fff';
        dropdown.style.border = '1px solid #30363d';
        dropdown.style.borderRadius = '6px';
        dropdown.style.fontSize = '14px';
        dropdown.style.padding = '0 32px 0 12px';
        dropdown.style.boxSizing = 'border-box';
        dropdown.style.appearance = 'none';
        dropdown.style.webkitAppearance = 'none';
        dropdown.style.mozAppearance = 'none';
        dropdown.style.position = 'relative';
        dropdown.style.margin = '0';
        dropdown.style.display = 'block';
        dropdown.style.outline = 'none';
        dropdown.style.cursor = 'pointer';
        dropdown.style.backgroundImage = 'url("data:image/svg+xml;utf8,<svg fill=\'%238b949e\' height=\'18\' viewBox=\'0 0 20 20\' width=\'18\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 8l4 4 4-4\' stroke=\'%238b949e\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>")';
        dropdown.style.backgroundRepeat = 'no-repeat';
        dropdown.style.backgroundPosition = 'right 10px center';
        dropdown.style.backgroundSize = '18px 18px';

        const addresses = Array.from(new Set(this.allData.map(p => p.address).filter(Boolean)));
        const prev = dropdown.value;
        dropdown.innerHTML = '<option value="all">All Worlds/Addresses</option>';
        addresses.forEach(addr => {
            const opt = document.createElement('option');
            opt.value = addr;
            opt.textContent = addr;
            dropdown.appendChild(opt);
        });
        dropdown.value = addresses.includes(prev) ? prev : 'all';
    }

    animate() {
        this.time += this.animationSpeed;
        this.smoothDisplayData();

        if (this.lastDataTime && Date.now() - this.lastDataTime > this.dataTimeout) {
            this.clearAllData();
        }

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
        const removedIcons = this.displayData.filter(d => !this.data.find(n => n.id === d.id));
        this.displayData = this.displayData.filter(d => this.data.find(n => n.id === d.id));

        if (this.selectedPointId && removedIcons.find(icon => icon.id === this.selectedPointId)) {
            this.selectedPointId = null;
            this.hideInfoPopup();
        }
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
        if (!this.isMobile) {
            this.drawSelectionBox();
        }
        this.updateInfoPopup();
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

            if (this.selectedPoints.has(point.id) || this.selectedPointId === point.id) {
                this.ctx.save();
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = 10;
                this.ctx.globalAlpha = 0.7;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 7, 0, Math.PI * 2);
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2.5;
                this.ctx.stroke();
                this.ctx.restore();
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

    drawSelectionBox() {
        if (!this.isSelecting || this.isMobile) return;

        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);

        this.ctx.save();
        this.ctx.strokeStyle = this.colors.highlight;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.globalAlpha = 0.8;

        this.ctx.shadowColor = this.colors.highlight;
        this.ctx.shadowBlur = 10;
        this.ctx.strokeRect(startX, startY, endX - startX, endY - startY);

        this.ctx.restore();
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.canvas.remove();
    }

    clearAllData() {
        this.data = [];
        this.displayData = [];
        this.selectedPointId = null;
        this.selectedPoints.clear();
        this.clearAllInfoPanels();
        this.focusedIdx = -1;
        this.trackingFocused = false;
        this.focusedList = [];
        this.updateFocusBtns();
        this.lastDataTime = 0;
        const dropdown = document.getElementById('address-dropdown');
        if (dropdown) {
            dropdown.innerHTML = '<option value="all">All Worlds/Addresses</option>';
            dropdown.value = 'all';
        }
    }

    updateMobileState() {
        this.isMobile = window.innerWidth <= 768;
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
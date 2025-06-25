let ws = null;

const DEFAULT_WS_URL = 'wss://spwai.glitch.me';

export function initWebSocket(graph, url = DEFAULT_WS_URL) {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(url);

    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'viewer' }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            let points = [];

            function parsePoint(obj) {
                const {
                    username,
                    type,
                    position,
                    velocity,
                    head,
                    aabb,
                    flags,
                    address,
                    id,
                    metadata
                } = obj;
                let normFlag = 'undefined';
                if (flags === 'worker') normFlag = 'worker';
                else if (flags === 'target') normFlag = 'target';
                else if (flags === 'default') normFlag = 'default';
                return {
                    name: username || '',
                    type: type || '',
                    position: position || { x: 0, y: 0, z: 0 },
                    velocity: velocity || { x: 0, y: 0, z: 0 },
                    head: head || { pitch: 0, yaw: 0, head_yaw: 0 },
                    aabb: aabb || { height: '?', width: '?', scale: '?' },
                    flags: normFlag,
                    address: address || 'unknown',
                    id: id,
                    metadata: metadata || {}
                };
            }

            if (Array.isArray(data)) {
                points = data.map(parsePoint);
            } else {
                points = [parsePoint(data)];
            }

            graph.lastDataTime = Date.now();
            graph.setData(points);
        } catch (e) {
            console.error('Invalid data from WebSocket:', e);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected.');
        if (graph && typeof graph.clearAllData === 'function') {
            graph.clearAllData();
        }
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
    };
} 
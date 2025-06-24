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

            if (Array.isArray(data)) {
                points = data.map(obj => {
                    const { id, position, flags } = obj;
                    let normFlag = 'undefined';
                    if (flags === 'worker') normFlag = 'worker';
                    else if (flags === 'target') normFlag = 'target';
                    else if (flags === 'default') normFlag = 'default';
                    return {
                        id: id,
                        position: { x: position.x, z: position.z },
                        flags: normFlag
                    };
                });
            } else {
                const { id, position, flags } = data;
                let normFlag = 'undefined';
                if (flags === 'worker') normFlag = 'worker';
                else if (flags === 'target') normFlag = 'target';
                else if (flags === 'default') normFlag = 'default';
                points = [{
                    id: id,
                    position: { x: position.x, z: position.z },
                    flags: normFlag
                }];
            }

            console.log('Received points:', points.length);
            graph.setData(points);
        } catch (e) {
            console.error('Invalid data from WebSocket:', e);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected.');
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
    };
} 
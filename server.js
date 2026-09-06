/**
 * WeatherWise - Secure Backend Proxy & Application Server
 * Shields external API keys from client exposure and serves the application.
 * Zero external dependencies (uses native Node.js).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// 1. Load Environment Variables (.env)
try {
    if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile();
    } else {
        // Fallback parser for older Node versions
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const [key, ...vals] = trimmed.split('=');
                    process.env[key.trim()] = vals.join('=').trim();
                }
            });
        }
    }
} catch (e) {
    console.warn('[Server] Notice: Could not auto-load .env file:', e.message);
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

if (!OPENWEATHER_API_KEY) {
    console.warn('[Server] WARNING: OPENWEATHER_API_KEY is not set in environment or .env file!');
}

// 2. MIME Types Dictionary
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

// 3. API Proxy Request Handler
async function handleApiRequest(req, res, parsedUrl) {
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    // Helper: JSON responder
    const sendJson = (statusCode, data) => {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        });
        res.end(JSON.stringify(data));
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        });
        res.end();
        return;
    }

    try {
        if (!OPENWEATHER_API_KEY && pathname !== '/api/uv') {
            return sendJson(500, { error: 'Server configuration error: API key missing' });
        }

        // Endpoint: /api/weather
        if (pathname === '/api/weather') {
            const city = searchParams.get('city');
            const lat = searchParams.get('lat');
            const lon = searchParams.get('lon');

            let targetUrl = '';
            if (city) {
                targetUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            } else if (lat && lon) {
                targetUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            } else {
                return sendJson(400, { error: 'Missing city or lat/lon parameters' });
            }

            const apiRes = await fetch(targetUrl);
            const data = await apiRes.json();
            return sendJson(apiRes.status, data);
        }

        // Endpoint: /api/forecast
        if (pathname === '/api/forecast') {
            const lat = searchParams.get('lat');
            const lon = searchParams.get('lon');
            if (!lat || !lon) return sendJson(400, { error: 'Missing lat/lon parameters' });

            const targetUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            const apiRes = await fetch(targetUrl);
            const data = await apiRes.json();
            return sendJson(apiRes.status, data);
        }

        // Endpoint: /api/aqi
        if (pathname === '/api/aqi') {
            const lat = searchParams.get('lat');
            const lon = searchParams.get('lon');
            if (!lat || !lon) return sendJson(400, { error: 'Missing lat/lon parameters' });

            const targetUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;
            const apiRes = await fetch(targetUrl);
            const data = await apiRes.json();
            return sendJson(apiRes.status, data);
        }

        // Endpoint: /api/uv (Open-Meteo Proxy)
        if (pathname === '/api/uv') {
            const lat = searchParams.get('lat');
            const lon = searchParams.get('lon');
            if (!lat || !lon) return sendJson(400, { error: 'Missing lat/lon parameters' });

            const targetUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index`;
            const apiRes = await fetch(targetUrl);
            const data = await apiRes.json();
            return sendJson(apiRes.status, data);
        }

        // Endpoint: /api/geo
        if (pathname === '/api/geo') {
            const q = searchParams.get('q');
            if (!q) return sendJson(400, { error: 'Missing query parameter q' });

            const targetUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${OPENWEATHER_API_KEY}`;
            const apiRes = await fetch(targetUrl);
            const data = await apiRes.json();
            return sendJson(apiRes.status, data);
        }

        // Unknown API route
        return sendJson(404, { error: 'API route not found' });

    } catch (err) {
        console.error('[Server] API proxy error:', err);
        return sendJson(502, { error: 'Failed to communicate with meteorological services', details: err.message });
    }
}

// 4. Static File Request Handler
function handleStaticRequest(req, res, parsedUrl) {
    let filePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
    // Normalize and prevent path traversal
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(__dirname, filePath);

    // Guard: Prevent accessing .env or server.js directly
    const relative = path.relative(__dirname, absolutePath);
    if (relative.startsWith('.env') || relative === 'server.js' || relative.startsWith('.git')) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Access Denied');
        return;
    }

    fs.stat(absolutePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="background:#0f172a;color:#fff;font-family:sans-serif;padding:40px;text-align:center;"><h2>404 - Page Not Found</h2><p><a href="/" style="color:#10b981;">Return to WeatherWise</a></p></body></html>`);
            return;
        }

        const ext = path.extname(absolutePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
        });

        fs.createReadStream(absolutePath).pipe(res);
    });
}

// 5. Create and Start Server
const server = http.createServer((req, res) => {
    // Parse URL
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (parsedUrl.pathname.startsWith('/api/')) {
        handleApiRequest(req, res, parsedUrl);
    } else {
        handleStaticRequest(req, res, parsedUrl);
    }
});

server.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`  WeatherWise Platform Launched & Running Securely!     `);
    console.log(`  URL: http://localhost:${PORT}                         `);
    console.log(`  Dashboard: http://localhost:${PORT}/app.html          `);
    console.log(`  API Key: HIDDEN (Securely proxied via /api/*)        `);
    console.log(`========================================================`);
});

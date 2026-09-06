/**
 * WeatherWise - Netlify Serverless API Function
 * Proxies meteorological requests and shields the OpenWeatherMap API key on Netlify.
 */

exports.handler = async (event, context) => {
    // 1. Retrieve API key from Netlify Environment Variables
    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

    // Helper: Standard JSON response
    const sendJson = (statusCode, payload) => ({
        statusCode,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(payload)
    });

    try {
        const rawPath = event.path || '';
        const params = event.queryStringParameters || {};

        // Extract endpoint name (e.g. /api/weather or /.netlify/functions/api/weather -> weather)
        const pathParts = rawPath.split('/').filter(Boolean);
        const endpoint = pathParts[pathParts.length - 1];

        // Endpoint: weather
        if (endpoint === 'weather') {
            if (!OPENWEATHER_API_KEY) return sendJson(500, { error: 'OPENWEATHER_API_KEY is not configured on Netlify.' });

            let targetUrl = '';
            if (params.city) {
                targetUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(params.city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            } else if (params.lat && params.lon) {
                targetUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${params.lat}&lon=${params.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            } else {
                return sendJson(400, { error: 'Missing city or lat/lon parameters' });
            }

            const res = await fetch(targetUrl);
            const data = await res.json();
            return sendJson(res.status, data);
        }

        // Endpoint: forecast
        if (endpoint === 'forecast') {
            if (!OPENWEATHER_API_KEY) return sendJson(500, { error: 'OPENWEATHER_API_KEY is not configured on Netlify.' });
            if (!params.lat || !params.lon) return sendJson(400, { error: 'Missing lat/lon parameters' });

            const targetUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${params.lat}&lon=${params.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            const res = await fetch(targetUrl);
            const data = await res.json();
            return sendJson(res.status, data);
        }

        // Endpoint: aqi
        if (endpoint === 'aqi') {
            if (!OPENWEATHER_API_KEY) return sendJson(500, { error: 'OPENWEATHER_API_KEY is not configured on Netlify.' });
            if (!params.lat || !params.lon) return sendJson(400, { error: 'Missing lat/lon parameters' });

            const targetUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${params.lat}&lon=${params.lon}&appid=${OPENWEATHER_API_KEY}`;
            const res = await fetch(targetUrl);
            const data = await res.json();
            return sendJson(res.status, data);
        }

        // Endpoint: uv
        if (endpoint === 'uv') {
            if (!params.lat || !params.lon) return sendJson(400, { error: 'Missing lat/lon parameters' });

            const targetUrl = `https://api.open-meteo.com/v1/forecast?latitude=${params.lat}&longitude=${params.lon}&current=uv_index`;
            const res = await fetch(targetUrl);
            const data = await res.json();
            return sendJson(res.status, data);
        }

        // Endpoint: geo
        if (endpoint === 'geo') {
            if (!OPENWEATHER_API_KEY) return sendJson(500, { error: 'OPENWEATHER_API_KEY is not configured on Netlify.' });
            if (!params.q) return sendJson(400, { error: 'Missing query parameter q' });

            const targetUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(params.q)}&limit=5&appid=${OPENWEATHER_API_KEY}`;
            const res = await fetch(targetUrl);
            const data = await res.json();
            return sendJson(res.status, data);
        }

        return sendJson(404, { error: `Endpoint '${endpoint}' not found` });

    } catch (err) {
        console.error('[Netlify Function Error]:', err);
        return sendJson(502, { error: 'Internal error communicating with meteorological providers', details: err.message });
    }
};

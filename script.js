/**
 * WeatherWise - SaaS AI Weather Intelligence Platform
 * Unified Core Engine & Intelligence Dashboard
 * Author: Rajveer Dhiman
 */

const IS_FILE_PROTOCOL = window.location.protocol === 'file:';

const CONFIG = {
    // On Netlify, all API calls go through the serverless proxy (/api)
    // Locally with server.js running, also routes through proxy (localhost:3000/api)
    API_BASE: IS_FILE_PROTOCOL ? 'http://localhost:3000/api' : '/api',
    DEFAULT_CITY: 'London'
};

const WEATHER_ICONS = {
    Clear: { day: 'fa-sun', night: 'fa-moon' },
    Clouds: { day: 'fa-cloud-sun', night: 'fa-cloud-moon' },
    Rain: { day: 'fa-cloud-showers-heavy', night: 'fa-cloud-rain' },
    Drizzle: { day: 'fa-cloud-rain', night: 'fa-cloud-rain' },
    Thunderstorm: { day: 'fa-cloud-bolt', night: 'fa-cloud-bolt' },
    Snow: { day: 'fa-snowflake', night: 'fa-snowflake' },
    Mist: { day: 'fa-smog', night: 'fa-smog' },
    Fog: { day: 'fa-smog', night: 'fa-smog' },
    Haze: { day: 'fa-smog', night: 'fa-smog' },
    Smoke: { day: 'fa-smog', night: 'fa-smog' },
    Dust: { day: 'fa-smog', night: 'fa-smog' },
    Sand: { day: 'fa-smog', night: 'fa-smog' },
    Ash: { day: 'fa-smog', night: 'fa-smog' },
    Squall: { day: 'fa-wind', night: 'fa-wind' },
    Tornado: { day: 'fa-tornado', night: 'fa-tornado' }
};

// ==========================================
// 1. DATA ACCESS LAYER (Secure Proxy + Fallback)
// ==========================================
class WeatherAPI {
    static async fetchProxy(endpointPath) {
        const url = `${CONFIG.API_BASE}${endpointPath}`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Weather data error');
    }

    static async fetchCurrent(city) {
        return await this.fetchProxy(`/weather?city=${encodeURIComponent(city)}`);
    }

    static async fetchCurrentByCoords(lat, lon) {
        return await this.fetchProxy(`/weather?lat=${lat}&lon=${lon}`);
    }

    static async fetchForecast(lat, lon) {
        return await this.fetchProxy(`/forecast?lat=${lat}&lon=${lon}`);
    }

    static async fetchAQI(lat, lon) {
        try {
            return await this.fetchProxy(`/aqi?lat=${lat}&lon=${lon}`);
        } catch (e) {
            return null;
        }
    }

    static async fetchUV(lat, lon) {
        try {
            const data = await this.fetchProxy(`/uv?lat=${lat}&lon=${lon}`);
            return data?.current ? data.current.uv_index : data;
        } catch (e) {
            return null;
        }
    }

    static async fetchGeo(query) {
        try {
            return await this.fetchProxy(`/geo?q=${encodeURIComponent(query)}`);
        } catch (e) {
            return [];
        }
    }
}

// ==========================================
// 2. AI RECOMMENDATION ENGINE
// ==========================================
class RecommendationEngine {
    static generate(weatherData, uvVal, aqiVal) {
        const temp = weatherData.main.temp;
        const condition = weatherData.weather[0].main;
        const windSpeed = weatherData.wind.speed * 3.6;
        const humidity = weatherData.main.humidity;
        const isRaining = condition.includes('Rain') || condition.includes('Drizzle') || condition.includes('Thunderstorm');
        const isClear = condition.includes('Clear');
        const isSnow = condition.includes('Snow');

        const recs = [];

        // 1. Outdoor Activities
        let outdoorScore = 70, outdoorMsg = 'Decent weather for outdoor activities', outdoorTag = 'Favorable';
        if (temp >= 18 && temp <= 27 && !isRaining && windSpeed < 20 && (aqiVal === null || aqiVal <= 2)) {
            outdoorScore = 96; outdoorMsg = 'Prime conditions for jogging, cycling, or picnics!'; outdoorTag = 'Optimal Window';
        } else if (isRaining) {
            outdoorScore = 25; outdoorMsg = 'Wet conditions. Cozy indoor entertainment recommended.'; outdoorTag = 'Indoor Preferred';
        } else if (temp > 33) {
            outdoorScore = 38; outdoorMsg = 'High heat index. Avoid midday strenuous exertion.'; outdoorTag = 'Hydration Alert';
        } else if (temp < 8) {
            outdoorScore = 40; outdoorMsg = 'Brisk temperatures. Layer up before venturing out.'; outdoorTag = 'Cold Weather';
        }
        recs.push({
            icon: 'fa-person-walking',
            title: 'Outdoor Activities',
            description: outdoorMsg,
            tag: outdoorTag,
            confidence: outdoorScore,
            color: '#10b981'
        });

        // 2. Health & Wellness (AQI / UV awareness)
        let healthScore = 80, healthMsg = 'Air quality is fair. Good for daily routine.', healthTag = 'Wellness Score';
        if (uvVal !== null && uvVal >= 7) {
            healthScore = 55; healthMsg = 'High UV exposure! Wear SPF 30+, sunglasses, and a hat.'; healthTag = 'Sun Protection';
        } else if (aqiVal !== null && aqiVal >= 4) {
            healthScore = 35; healthMsg = 'Elevated particulate pollution. Sensitive groups should wear masks.'; healthTag = 'Air Quality Advisory';
        } else if (humidity > 80 && temp > 28) {
            healthScore = 60; healthMsg = 'Muggy and humid. Stay hydrated and prioritize ventilation.'; healthTag = 'High Humidity';
        } else if (!isRaining && temp >= 16 && temp <= 26) {
            healthScore = 94; healthMsg = 'Invigorating atmosphere. Excellent for morning meditation or workout.'; healthTag = 'Peak Wellness';
        }
        recs.push({
            icon: 'fa-heart-pulse',
            title: 'Health & Wellness',
            description: healthMsg,
            tag: healthTag,
            confidence: healthScore,
            color: '#ef4444'
        });

        // 3. Travel & Sightseeing
        let travelScore = 75, travelMsg = 'Good visibility for local excursions', travelTag = 'Scenic Tour';
        if (isClear && temp >= 18 && temp <= 28) {
            travelScore = 95; travelMsg = 'Crystal-clear sky. Perfect for city walks and architectural tours.'; travelTag = 'Sightseeing Golden Hour';
        } else if (isRaining) {
            travelScore = 42; travelMsg = 'Precipitation expected. Art galleries, museums, and cafés are best.'; travelTag = 'Cultural Spots';
        } else if (isSnow) {
            travelScore = 88; travelMsg = 'Scenic winter vistas. Exercise caution on roadways.'; travelTag = 'Winter Wonderland';
        } else if (temp > 32) {
            travelScore = 50; travelMsg = 'High temperatures. Seek climate-controlled venues or water parks.'; travelTag = 'Cool Retreats';
        }
        recs.push({
            icon: 'fa-compass',
            title: 'Travel & Mobility',
            description: travelMsg,
            tag: travelTag,
            confidence: travelScore,
            color: '#3b82f6'
        });

        // 4. Photography & Content Creation
        let photoScore = 70, photoMsg = 'Soft ambient lighting for portraits', photoTag = 'Photography';
        if (isClear) {
            photoScore = 90; photoMsg = 'Crisp sunlight and sharp shadows. Great for landscape & golden hour.'; photoTag = 'High Contrast';
        } else if (condition.includes('Clouds')) {
            photoScore = 85; photoMsg = 'Diffused, even daylight. Perfect natural softbox for outdoor portraits.'; photoTag = 'Soft Light';
        } else if (isRaining) {
            photoScore = 68; photoMsg = 'Rich reflections and moody cinematic urban aesthetics.'; photoTag = 'Cinematic Rain';
        } else if (isSnow) {
            photoScore = 95; photoMsg = 'High reflectance snowscapes. Adjust exposure compensation for brightness.'; photoTag = 'Vibrant Snow';
        }
        recs.push({
            icon: 'fa-camera',
            title: 'Creative & Photography',
            description: photoMsg,
            tag: photoTag,
            confidence: photoScore,
            color: '#8b5cf6'
        });

        // 5. Laundry & Drying
        let laundryScore = 60, laundryMsg = 'Average drying conditions indoors or outdoors', laundryTag = 'Drying Index';
        if (!isRaining && humidity < 60 && windSpeed > 10) {
            laundryScore = 95; laundryMsg = 'Warm breeze and low humidity. Clothes will dry rapidly outside.'; laundryTag = 'Rapid Drying';
        } else if (isRaining) {
            laundryScore = 15; laundryMsg = 'Rainy conditions. Keep drying racks indoors with adequate airflow.'; laundryTag = 'Indoor Only';
        } else if (humidity > 80) {
            laundryScore = 40; laundryMsg = 'High ambient moisture. Line drying will be prolonged.'; laundryTag = 'Slow Evaporation';
        }
        recs.push({
            icon: 'fa-shirt',
            title: 'Laundry & Eco-Drying',
            description: laundryMsg,
            tag: laundryTag,
            confidence: laundryScore,
            color: '#06b6d4'
        });

        // 6. Gardening & Agriculture
        let gardenScore = 65, gardenMsg = 'Routine plant maintenance', gardenTag = 'Gardening';
        if (isRaining) {
            gardenScore = 90; gardenMsg = 'Natural rainwater nourishment. Excellent for ground soaking and new shoots.'; gardenTag = 'Rain Fed';
        } else if (temp > 32 && humidity < 40) {
            gardenScore = 40; gardenMsg = 'High evaporation rate. Hydrate root systems early morning or at dusk.'; gardenTag = 'Watering Required';
        } else if (temp >= 15 && temp <= 26 && !isRaining) {
            gardenScore = 88; gardenMsg = 'Temperate soil and air. Ideal for pruning, repotting, and harvesting.'; gardenTag = 'Prime Cultivation';
        }
        recs.push({
            icon: 'fa-seedling',
            title: 'Gardening & Plants',
            description: gardenMsg,
            tag: gardenTag,
            confidence: gardenScore,
            color: '#f59e0b'
        });

        return recs;
    }
}

// ==========================================
// 3. UI PRESENTATION & INTERACTION LAYER
// ==========================================
class UIManager {
    constructor() {
        this.elements = {
            searchBtn: document.getElementById('searchBtn'),
            geoLocateBtn: document.getElementById('geoLocateBtn'),
            cityInput: document.getElementById('city'),
            weatherResult: document.getElementById('weatherResult'),
            skeletonLoader: document.getElementById('skeletonLoader'),
            emptyState: document.getElementById('emptyState'),
            cityName: document.getElementById('cityName'),
            countryBadge: document.getElementById('countryBadge'),
            temperature: document.getElementById('temperature'),
            feelsLike: document.getElementById('feelsLike'),
            description: document.getElementById('description'),
            weatherIcon: document.getElementById('weatherIcon'),
            humidity: document.getElementById('humidity'),
            wind: document.getElementById('wind'),
            uvIndex: document.getElementById('uvIndex'),
            aqi: document.getElementById('aqi'),
            pressure: document.getElementById('pressure'),
            visibility: document.getElementById('visibility'),
            sunrise: document.getElementById('sunrise'),
            sunset: document.getElementById('sunset'),
            forecastGrid: document.getElementById('forecastGrid'),
            recommendationsSection: document.getElementById('recommendationsSection'),
            recommendationsGrid: document.getElementById('recommendationsGrid'),
            autocomplete: document.getElementById('autocomplete-dropdown'),
            recentSearchesContainer: document.getElementById('recentSearches'),
            unitToggleBtns: document.querySelectorAll('.unit-btn')
        };

        this.initCardTilt();
    }

    toggleLoading(isLoading) {
        if (isLoading) {
            if (this.elements.skeletonLoader) this.elements.skeletonLoader.classList.remove('hidden');
            if (this.elements.weatherResult) this.elements.weatherResult.classList.add('hidden');
            if (this.elements.emptyState) this.elements.emptyState.classList.add('hidden');
            if (this.elements.recommendationsSection) this.elements.recommendationsSection.classList.add('hidden');
        } else {
            if (this.elements.skeletonLoader) this.elements.skeletonLoader.classList.add('hidden');
            if (this.elements.weatherResult) this.elements.weatherResult.classList.remove('hidden');
            if (this.elements.emptyState) this.elements.emptyState.classList.add('hidden');
            if (this.elements.recommendationsSection) this.elements.recommendationsSection.classList.remove('hidden');
        }
    }

    renderCurrentWeather(data, uvVal, aqiVal, unit = 'C') {
        const { name, sys, main, weather, wind, visibility } = data;
        const condition = weather[0].main;
        const iconMeta = WEATHER_ICONS[condition] || { day: 'fa-cloud', night: 'fa-cloud' };
        const isDay = weather[0].icon ? weather[0].icon.endsWith('d') : true;
        const iconClass = isDay ? iconMeta.day : iconMeta.night;

        // City & Country
        if (this.elements.cityName) {
            this.elements.cityName.textContent = name;
        }
        if (this.elements.countryBadge) {
            this.elements.countryBadge.textContent = sys.country || '';
        }

        // Description
        if (this.elements.description) {
            this.elements.description.textContent = weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
        }

        // Temperature (Formatted to unit)
        const tempVal = unit === 'F' ? (main.temp * 9/5) + 32 : main.temp;
        const feelsVal = unit === 'F' ? (main.feels_like * 9/5) + 32 : main.feels_like;

        if (this.elements.temperature) {
            this.elements.temperature.textContent = `${Math.round(tempVal)}°${unit}`;
        }
        if (this.elements.feelsLike) {
            this.elements.feelsLike.textContent = `${Math.round(feelsVal)}°${unit}`;
        }

        // Weather Icon
        if (this.elements.weatherIcon) {
            this.elements.weatherIcon.innerHTML = `<i class="fas ${iconClass}"></i>`;
        }

        // Humidity
        if (this.elements.humidity) {
            this.elements.humidity.textContent = `${main.humidity}%`;
        }

        // Wind (km/h + compass bearing)
        const windKm = Math.round(wind.speed * 3.6);
        const windDir = this.getCompassDirection(wind.deg);
        if (this.elements.wind) {
            this.elements.wind.textContent = `${windKm} km/h ${windDir}`;
        }

        // UV Index
        if (this.elements.uvIndex) {
            if (uvVal !== null && !isNaN(uvVal)) {
                const uvCategory = this.getUVCategory(uvVal);
                this.elements.uvIndex.innerHTML = `<span class="metric-value">${uvVal.toFixed(1)}</span> <span class="badge badge-${uvCategory.color}">${uvCategory.label}</span>`;
            } else {
                this.elements.uvIndex.innerHTML = `<span class="metric-value">Moderate</span>`;
            }
        }

        // Air Quality Index (AQI)
        if (this.elements.aqi) {
            const aqiScore = aqiVal?.list?.[0]?.main?.aqi;
            const aqiData = this.getAQICategory(aqiScore);
            this.elements.aqi.innerHTML = `<span class="metric-value">${aqiData.label}</span>`;
        }

        // Pressure
        if (this.elements.pressure) {
            this.elements.pressure.textContent = `${main.pressure} hPa`;
        }

        // Visibility
        if (this.elements.visibility) {
            const visKm = visibility ? (visibility / 1000).toFixed(1) : '10.0';
            this.elements.visibility.textContent = `${visKm} km`;
        }

        // Sunrise & Sunset (Local city timezone)
        if (this.elements.sunrise && sys.sunrise && data.timezone !== undefined) {
            this.elements.sunrise.textContent = this.formatLocalTime(sys.sunrise, data.timezone);
        }
        if (this.elements.sunset && sys.sunset && data.timezone !== undefined) {
            this.elements.sunset.textContent = this.formatLocalTime(sys.sunset, data.timezone);
        }

        // Ambient background glow dynamic update
        this.updateAtmosphere(condition, isDay);
    }

    renderForecast(forecastData, unit = 'C') {
        if (!this.elements.forecastGrid) return;
        this.elements.forecastGrid.innerHTML = '';

        // Select daily points (spaced ~24 hours apart)
        const dailyItems = forecastData.list.filter((_, idx) => idx % 8 === 0).slice(0, 5);

        dailyItems.forEach((day, index) => {
            const date = new Date(day.dt * 1000);
            const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const cond = day.weather[0].main;
            const iconMeta = WEATHER_ICONS[cond] || { day: 'fa-cloud', night: 'fa-cloud' };
            const tempVal = unit === 'F' ? (day.main.temp * 9/5) + 32 : day.main.temp;
            const minVal = unit === 'F' ? (day.main.temp_min * 9/5) + 32 : day.main.temp_min;

            const card = document.createElement('div');
            card.className = 'forecast-item glass-card';
            card.innerHTML = `
                <div class="forecast-date">
                    <span class="forecast-day">${dayName}</span>
                    <span class="forecast-subdate">${monthDay}</span>
                </div>
                <div class="forecast-icon">
                    <i class="fas ${iconMeta.day}"></i>
                </div>
                <div class="forecast-temps">
                    <span class="forecast-temp-high">${Math.round(tempVal)}°${unit}</span>
                    <span class="forecast-temp-low">${Math.round(minVal - 2)}°</span>
                </div>
                <div class="forecast-desc">${day.weather[0].main}</div>
            `;
            this.elements.forecastGrid.appendChild(card);
        });
    }

    renderRecommendations(recs) {
        if (!this.elements.recommendationsGrid) return;
        this.elements.recommendationsGrid.innerHTML = '';

        recs.forEach((rec, idx) => {
            const card = document.createElement('div');
            card.className = 'recommendation-card glass-card';
            card.style.setProperty('--rec-color', rec.color);

            card.innerHTML = `
                <div class="recommendation-header">
                    <div class="recommendation-icon" style="background: ${rec.color}18; color: ${rec.color};">
                        <i class="fas ${rec.icon}"></i>
                    </div>
                    <span class="recommendation-tag" style="background: ${rec.color}15; color: ${rec.color};">
                        ${rec.tag}
                    </span>
                </div>
                <h3 class="recommendation-title">${rec.title}</h3>
                <p class="recommendation-desc">${rec.description}</p>
                <div class="recommendation-confidence">
                    <div class="confidence-labels">
                        <span class="confidence-title">AI Compatibility</span>
                        <span class="confidence-score">${rec.confidence}%</span>
                    </div>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: 0%; background: linear-gradient(90deg, ${rec.color}, #34d399);"
                             data-width="${rec.confidence}%"></div>
                    </div>
                </div>
            `;
            this.elements.recommendationsGrid.appendChild(card);
        });

        // Trigger smooth fill animations
        requestAnimationFrame(() => {
            setTimeout(() => {
                document.querySelectorAll('.confidence-fill[data-width]').forEach(fill => {
                    fill.style.width = fill.getAttribute('data-width');
                });
            }, 60);
        });
    }

    renderRecentSearches(cities, onSelect, onClear) {
        if (!this.elements.recentSearchesContainer) return;
        this.elements.recentSearchesContainer.innerHTML = '';

        if (!cities || cities.length === 0) {
            this.elements.recentSearchesContainer.classList.add('hidden');
            return;
        }

        this.elements.recentSearchesContainer.classList.remove('hidden');

        const wrapper = document.createElement('div');
        wrapper.className = 'recent-chips-wrapper';

        const label = document.createElement('span');
        label.className = 'recent-label';
        label.innerHTML = '<i class="fas fa-clock-rotate-left"></i> Recent:';
        wrapper.appendChild(label);

        cities.forEach(city => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'recent-chip';
            chip.textContent = city;
            chip.onclick = (e) => {
                e.preventDefault();
                onSelect(city);
            };
            wrapper.appendChild(chip);
        });

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'recent-clear-btn';
        clearBtn.title = 'Clear search history';
        clearBtn.innerHTML = '<i class="fas fa-xmark"></i>';
        clearBtn.onclick = (e) => {
            e.preventDefault();
            onClear();
        };
        wrapper.appendChild(clearBtn);

        this.elements.recentSearchesContainer.appendChild(wrapper);
    }

    showError(message, onRetry) {
        if (!this.elements.weatherResult) return;
        this.elements.weatherResult.classList.remove('hidden');
        if (this.elements.emptyState) this.elements.emptyState.classList.add('hidden');
        if (this.elements.recommendationsSection) this.elements.recommendationsSection.classList.add('hidden');

        this.elements.weatherResult.innerHTML = `
            <div class="weather-card glass-card error-card">
                <div class="error-icon"><i class="fas fa-triangle-exclamation"></i></div>
                <h2 class="error-title">City Not Found</h2>
                <p class="error-desc">${message || 'Please check the spelling and try again.'}</p>
                <div class="error-actions">
                    <button class="primary-btn retry-btn" id="retryBtn">
                        <i class="fas fa-rotate-right"></i> Try Again
                    </button>
                </div>
            </div>
        `;

        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn && onRetry) {
            retryBtn.onclick = onRetry;
        }
    }

    updateAtmosphere(condition, isDay) {
        const blobs = document.querySelectorAll('.blob');
        if (!blobs || blobs.length < 3) return;

        let colors = [
            'rgba(16, 185, 129, 0.25)',
            'rgba(59, 130, 246, 0.2)',
            'rgba(245, 158, 11, 0.15)'
        ];

        if (condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm') {
            colors = [
                'rgba(56, 189, 248, 0.3)',
                'rgba(30, 41, 59, 0.6)',
                'rgba(99, 102, 241, 0.25)'
            ];
        } else if (condition === 'Clear') {
            colors = isDay
                ? ['rgba(245, 158, 11, 0.35)', 'rgba(251, 191, 36, 0.25)', 'rgba(16, 185, 129, 0.2)']
                : ['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.25)', 'rgba(15, 23, 42, 0.5)'];
        } else if (condition === 'Snow') {
            colors = [
                'rgba(224, 242, 254, 0.4)',
                'rgba(186, 230, 253, 0.3)',
                'rgba(96, 165, 250, 0.2)'
            ];
        }

        blobs.forEach((blob, idx) => {
            if (colors[idx]) {
                blob.style.background = `radial-gradient(circle, ${colors[idx]}, transparent)`;
            }
        });
    }

    initCardTilt() {
        // Scoped subtle tilt effect on hover
        const cards = document.querySelectorAll('.glass-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left - (rect.width / 2);
                const y = e.clientY - rect.top - (rect.height / 2);
                const tiltX = (y / rect.height) * 5;
                const tiltY = -(x / rect.width) * 5;
                card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    getCompassDirection(deg) {
        if (deg === undefined || deg === null) return '';
        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const idx = Math.round(deg / 22.5) % 16;
        return dirs[idx];
    }

    getUVCategory(val) {
        if (val < 3) return { label: 'Low', color: 'emerald' };
        if (val < 6) return { label: 'Moderate', color: 'amber' };
        if (val < 8) return { label: 'High', color: 'orange' };
        if (val < 11) return { label: 'Very High', color: 'red' };
        return { label: 'Extreme', color: 'purple' };
    }

    getAQICategory(score) {
        switch (score) {
            case 1: return { label: 'Good (1)', level: 'good' };
            case 2: return { label: 'Fair (2)', level: 'fair' };
            case 3: return { label: 'Moderate (3)', level: 'moderate' };
            case 4: return { label: 'Poor (4)', level: 'poor' };
            case 5: return { label: 'Very Poor (5)', level: 'very-poor' };
            default: return { label: 'Normal', level: 'good' };
        }
    }

    formatLocalTime(timestamp, timezoneOffsetSeconds) {
        const utcDate = new Date(timestamp * 1000);
        // Calculate destination date using target city timezone offset
        const targetTimeMs = utcDate.getTime() + (timezoneOffsetSeconds * 1000);
        const targetDate = new Date(targetTimeMs);
        const hours = targetDate.getUTCHours();
        const mins = targetDate.getUTCMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHour = hours % 12 || 12;
        return `${formattedHour}:${mins} ${ampm}`;
    }
}

// ==========================================
// 4. MAIN APP CONTROLLER & ORCHESTRATION
// ==========================================
class AppController {
    constructor() {
        this.ui = new UIManager();
        this.unit = localStorage.getItem('weatherwise_unit') || 'C';
        this.recentSearches = this.loadRecentSearches();

        // Cached active dataset
        this.currentData = null;
        this.forecastData = null;
        this.aqiData = null;
        this.uvVal = null;

        this.initEventListeners();
        this.initUnitToggle();
        this.renderRecentSearches();
        this.initAutoStartup();
    }

    initEventListeners() {
        // Search Button click
        if (this.ui.elements.searchBtn) {
            this.ui.elements.searchBtn.addEventListener('click', () => this.handleSearch());
        }

        // Enter key in input
        if (this.ui.elements.cityInput) {
            this.ui.elements.cityInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.ui.elements.autocomplete?.classList.add('hidden');
                    this.handleSearch();
                }
            });

            // Autocomplete with debouncing
            this.ui.elements.cityInput.addEventListener('input', debounce(async (e) => {
                const query = e.target.value.trim();
                if (query.length < 2) {
                    this.ui.elements.autocomplete?.classList.add('hidden');
                    return;
                }
                try {
                    const cities = await WeatherAPI.fetchGeo(query);
                    this.renderAutocomplete(cities);
                } catch (err) {
                    console.warn('Autocomplete fetch failed:', err);
                }
            }, 250));
        }

        // GPS "Locate Me" Button
        if (this.ui.elements.geoLocateBtn) {
            this.ui.elements.geoLocateBtn.addEventListener('click', () => this.handleGeolocation(true));
        }

        // Share Button click
        this.initShareButton();

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.ui.elements.cityInput && this.ui.elements.autocomplete) {
                if (!this.ui.elements.cityInput.contains(e.target) && !this.ui.elements.autocomplete.contains(e.target)) {
                    this.ui.elements.autocomplete.classList.add('hidden');
                }
            }
        });
    }

    initShareButton() {
        const shareBtn = document.getElementById('shareBtn');
        if (!shareBtn) return;

        shareBtn.addEventListener('click', async () => {
            const cityName = this.currentData?.name || 'WeatherWise';
            const temp = this.currentData ? `${Math.round(this.currentData.main.temp)}°${this.unit}` : '';
            const shareUrl = window.location.href;

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Weather in ${cityName} - WeatherWise`,
                        text: `Check live weather in ${cityName} (${temp}) with AI recommendations on WeatherWise!`,
                        url: shareUrl
                    });
                    return;
                } catch (e) {
                    // User dismissed native share sheet
                }
            }

            // Clipboard fallback
            try {
                await navigator.clipboard.writeText(shareUrl);
                this.showToast('Link copied to clipboard! Send it to anyone.');
            } catch {
                prompt('Copy and send this weather link:', shareUrl);
            }
        });
    }

    showToast(message) {
        const toast = document.getElementById('shareToast');
        if (!toast) return;
        const span = toast.querySelector('span');
        if (span) span.textContent = message;
        toast.classList.remove('hidden');
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 350);
        }, 3200);
    }

    initUnitToggle() {
        // Set initial button state
        this.ui.elements.unitToggleBtns.forEach(btn => {
            if (btn.getAttribute('data-unit') === this.unit) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            btn.addEventListener('click', () => {
                const newUnit = btn.getAttribute('data-unit');
                if (newUnit === this.unit) return;

                this.unit = newUnit;
                localStorage.setItem('weatherwise_unit', this.unit);

                this.ui.elements.unitToggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Re-render data in new unit without re-fetching
                if (this.currentData && this.forecastData) {
                    this.ui.renderCurrentWeather(this.currentData, this.uvVal, this.aqiData, this.unit);
                    this.ui.renderForecast(this.forecastData, this.unit);
                }
            });
        });
    }

    initAutoStartup() {
        // 1. Check if URL contains ?city=... from a shared link
        const urlParams = new URLSearchParams(window.location.search);
        const cityParam = urlParams.get('city');
        if (cityParam && cityParam.trim()) {
            this.fetchWeatherData(cityParam.trim());
            return;
        }

        // 2. Geolocation or default/recent city
        const lastCity = this.recentSearches[0];
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.fetchByCoords(pos.coords.latitude, pos.coords.longitude);
                },
                () => {
                    // Fallback to recent search or London
                    this.fetchWeatherData(lastCity || CONFIG.DEFAULT_CITY);
                },
                { timeout: 4000 }
            );
        } else {
            this.fetchWeatherData(lastCity || CONFIG.DEFAULT_CITY);
        }
    }

    async handleSearch() {
        const city = this.ui.elements.cityInput.value.trim();
        if (!city) return;
        await this.fetchWeatherData(city);
    }

    async handleGeolocation(isUserInitiated = false) {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        const geoBtn = this.ui.elements.geoLocateBtn;
        if (geoBtn) {
            geoBtn.classList.add('spinning');
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                if (geoBtn) geoBtn.classList.remove('spinning');
                await this.fetchByCoords(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                if (geoBtn) geoBtn.classList.remove('spinning');
                if (isUserInitiated) {
                    alert('Location access was denied or timed out. Please search for your city name.');
                }
            },
            { timeout: 8000, enableHighAccuracy: true }
        );
    }

    async fetchWeatherData(cityName) {
        this.ui.toggleLoading(true);

        try {
            const currentData = await WeatherAPI.fetchCurrent(cityName);
            const { lat, lon } = currentData.coord;

            const [forecastData, aqiData, uvVal] = await Promise.all([
                WeatherAPI.fetchForecast(lat, lon),
                WeatherAPI.fetchAQI(lat, lon),
                WeatherAPI.fetchUV(lat, lon)
            ]);

            this.currentData = currentData;
            this.forecastData = forecastData;
            this.aqiData = aqiData;
            this.uvVal = uvVal;

            // Render all UI sections
            this.ui.renderCurrentWeather(currentData, uvVal, aqiData, this.unit);
            this.ui.renderForecast(forecastData, this.unit);

            const recs = RecommendationEngine.generate(currentData, uvVal, aqiData?.list?.[0]?.main?.aqi);
            this.ui.renderRecommendations(recs);

            // Re-apply tilt bindings to new elements
            this.ui.initCardTilt();

            // Save to recent searches
            this.saveRecentSearch(currentData.name);
            this.ui.elements.cityInput.value = currentData.name;

            // Update URL bar with shareable query parameter
            try {
                const url = new URL(window.location);
                url.searchParams.set('city', currentData.name);
                window.history.replaceState({}, '', url);
            } catch (e) {}

        } catch (err) {
            console.error('Fetch weather error:', err);
            this.ui.showError(err.message, () => {
                this.ui.elements.cityInput.focus();
            });
        } finally {
            this.ui.toggleLoading(false);
        }
    }

    async fetchByCoords(lat, lon) {
        this.ui.toggleLoading(true);

        try {
            const currentData = await WeatherAPI.fetchCurrentByCoords(lat, lon);
            const [forecastData, aqiData, uvVal] = await Promise.all([
                WeatherAPI.fetchForecast(lat, lon),
                WeatherAPI.fetchAQI(lat, lon),
                WeatherAPI.fetchUV(lat, lon)
            ]);

            this.currentData = currentData;
            this.forecastData = forecastData;
            this.aqiData = aqiData;
            this.uvVal = uvVal;

            this.ui.renderCurrentWeather(currentData, uvVal, aqiData, this.unit);
            this.ui.renderForecast(forecastData, this.unit);

            const recs = RecommendationEngine.generate(currentData, uvVal, aqiData?.list?.[0]?.main?.aqi);
            this.ui.renderRecommendations(recs);

            this.ui.initCardTilt();

            this.saveRecentSearch(currentData.name);
            if (this.ui.elements.cityInput) {
                this.ui.elements.cityInput.value = currentData.name;
            }

            // Update URL bar with shareable query parameter
            try {
                const url = new URL(window.location);
                url.searchParams.set('city', currentData.name);
                window.history.replaceState({}, '', url);
            } catch (e) {}

        } catch (err) {
            console.error('Fetch coords error:', err);
            this.ui.showError('Unable to fetch weather for your location.', () => {
                this.handleGeolocation(true);
            });
        } finally {
            this.ui.toggleLoading(false);
        }
    }

    renderAutocomplete(cities) {
        const dropdown = this.ui.elements.autocomplete;
        if (!dropdown) return;

        dropdown.innerHTML = '';
        if (!cities || cities.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }

        dropdown.classList.remove('hidden');

        cities.forEach(city => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            const stateText = city.state ? `${city.state}, ` : '';
            item.innerHTML = `
                <i class="fas fa-location-dot"></i>
                <div class="dropdown-info">
                    <span class="dropdown-city">${city.name}</span>
                    <span class="dropdown-country">${stateText}${city.country}</span>
                </div>
            `;

            item.onclick = () => {
                this.ui.elements.cityInput.value = city.name;
                dropdown.classList.add('hidden');
                this.fetchWeatherData(city.name);
            };

            dropdown.appendChild(item);
        });
    }

    loadRecentSearches() {
        try {
            const stored = localStorage.getItem('weatherwise_recent');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    saveRecentSearch(city) {
        if (!city) return;
        let list = this.loadRecentSearches();
        list = list.filter(item => item.toLowerCase() !== city.toLowerCase());
        list.unshift(city);
        if (list.length > 5) list = list.slice(0, 5);
        this.recentSearches = list;
        localStorage.setItem('weatherwise_recent', JSON.stringify(list));
        this.renderRecentSearches();
    }

    renderRecentSearches() {
        this.ui.renderRecentSearches(
            this.recentSearches,
            (city) => {
                this.ui.elements.cityInput.value = city;
                this.fetchWeatherData(city);
            },
            () => {
                this.recentSearches = [];
                localStorage.removeItem('weatherwise_recent');
                this.renderRecentSearches();
            }
        );
    }
}

// Utility: Debounce function
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
});
const TV_STATIONS = {
    "WXTV": "0000014d-0712-d7c0-a1dd-ef564db40000",
    "KMEX": "0000014d-070d-ddc6-a5dd-179f207d0000",
    "WGBO": "0000014d-071b-d7c0-a1dd-ef5fe8a30000",
    "WUVP": "0000014d-0b3a-d7c0-a1dd-eb7e34f90000",
    "KUVN": "0000014d-0722-ddc6-a5dd-17b6b1a60000",
    "KDTV": "0000014d-0724-d7c0-a1dd-ef7401460000",
    "WFDC": "0000017c-703b-dc04-a3fc-747f8b2d0000",
    "KXLN": "0000014d-071a-d7c0-a1dd-ef5e405a0000",
    "WUVG": "0000014d-0b3c-ddc6-a5dd-1bbe72000000",
    "KTVW": "0000014d-071e-d7c0-a1dd-ef5e76940000",
    "WVEA": "0000017c-50cd-d48f-affc-58fdb4b80000",
    "WLTV": "0000014d-0717-ddc6-a5dd-179779c80000",
    "WVEN": "0000017c-7031-d667-a17f-fa7746fb0000",
    "KUVS": "0000014d-0b36-ddc6-a5dd-1bb67aa30000",
    "KWEX": "0000014d-0b36-ddc6-a5dd-1bb62fa10000",
    "KAKW": "0000014d-0725-ddc6-a5dd-17b74f6b0000",
    "KFTV": "0000014d-0727-ddc6-a5dd-17b78b560000",
    "WLII": "0000014d-0b3c-ddc6-a5dd-1bbe0db80000",
    "KUTH": "00000171-32da-d154-ab7d-33fbed240021"
};

const TELEMUNDO_STATIONS = {
    "KHRR": "85720",
    "WRDM": "06180"
};

const stationSelect = document.getElementById('station-select');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const weatherContainer = document.getElementById('weather-container');
const stationName = document.getElementById('station-name');
const weatherBody = document.getElementById('weather-body');

function populateDropdown() {
    const univisionGroup = document.getElementById('univision-group');
    const telemundoGroup = document.getElementById('telemundo-group');

    for (const code of Object.keys(TV_STATIONS)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = code;
        univisionGroup.appendChild(option);
    }

    for (const code of Object.keys(TELEMUNDO_STATIONS)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = code;
        telemundoGroup.appendChild(option);
    }
}

function showLoading() {
    loading.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    weatherContainer.classList.add('hidden');
}

function showError(message) {
    loading.classList.add('hidden');
    errorDiv.classList.remove('hidden');
    errorDiv.textContent = message;
    weatherContainer.classList.add('hidden');
}

function showWeather() {
    loading.classList.add('hidden');
    errorDiv.classList.add('hidden');
    weatherContainer.classList.remove('hidden');
}

function formatDateYYYYMMDD(localeTime) {
    const date = new Date(localeTime);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
}

function formatDateMMDDYYYY(localDate) {
    const date = new Date(localDate);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
}

function createRow(date, high, low, precipType, precipChance, phrase) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${date}</td>
        <td>${high}</td>
        <td>${low}</td>
        <td>${precipType}</td>
        <td>${precipChance} %</td>
        <td>${phrase}</td>
    `;
    return row;
}

async function fetchUnivision(stationCode) {
    const targetUrl = 'https://graphql.univision.com/';
    const url = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    const query = {
        query: `query getForecastByTVStation($language: WeatherForecastLanguage!, $tvStation: TvStation!) {
            getWeatherForecastByTvStation(language: $language, tvStation: $tvStation) {
                tempF
                icon
                phrase
                maxTempF
                minTempF
                humidity
                windDirection
                windSpeedMph
                precipChance
                precipType
                forecasts {
                    daily {
                        localeTime
                        icon
                        precipChance
                        precipType
                        phrase
                        minTempF
                        maxTempF
                    }
                }
            }
        }`,
        variables: {
            tvStation: stationCode,
            language: 'ES'
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
    });

    if (!response.ok) {
        throw new Error(`Univision API returned ${response.status}`);
    }

    const data = await response.json();
    const weather = data.data?.getWeatherForecastByTvStation;
    if (!weather) {
        throw new Error('No weather data returned from Univision');
    }

    weatherBody.innerHTML = '';
    stationName.textContent = stationCode;

    // Current conditions
    weatherBody.appendChild(createRow(
        'CURRENT',
        weather.maxTempF,
        weather.minTempF,
        weather.precipType ?? 'N/A',
        weather.precipChance,
        weather.phrase
    ));

    // Daily forecasts
    for (const forecast of weather.forecasts.daily) {
        weatherBody.appendChild(createRow(
            formatDateYYYYMMDD(forecast.localeTime),
            forecast.maxTempF,
            forecast.minTempF,
            forecast.precipType ?? 'N/A',
            forecast.precipChance,
            forecast.phrase
        ));
    }

    showWeather();
}

async function fetchTelemundo(stationCode, zipCode) {
    const targetUrl = `https://www.telemundoarizona.com/el-tiempo/latest.json/?zipCode=${zipCode}`;
    // Use a CORS proxy because the Telemundo API doesn't allow cross-origin browser requests.
    // corsproxy.io's free tier explicitly supports github.io origins.
    const url = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Telemundo API returned ${response.status}`);
    }

    const data = await response.json();
    const current = data.current_observation;
    if (!current) {
        throw new Error('No current observation data returned from Telemundo');
    }

    weatherBody.innerHTML = '';
    stationName.textContent = stationCode;

    // Current conditions
    weatherBody.appendChild(createRow(
        'CURRENT',
        current.hiTempF,
        current.loTempF,
        current.precipType ?? 'N/A',
        current.precip,
        current.phraseDay
    ));

    // Daily forecasts
    for (const day of data.daily_forecast) {
        const daypart = day.daypart?.day;
        weatherBody.appendChild(createRow(
            formatDateMMDDYYYY(day.time.local_date),
            day.hiTempF,
            day.loTempF,
            daypart?.precipType ?? 'N/A',
            day.precip,
            daypart?.wxPhraseLong ?? 'N/A'
        ));
    }

    showWeather();
}

async function loadStation(stationCode) {
    if (!stationCode) return;

    showLoading();

    try {
        if (TELEMUNDO_STATIONS[stationCode]) {
            await fetchTelemundo(stationCode, TELEMUNDO_STATIONS[stationCode]);
        } else if (TV_STATIONS[stationCode]) {
            await fetchUnivision(stationCode);
        } else {
            showError(`Invalid TV Station Code: ${stationCode}`);
        }
    } catch (err) {
        console.error(err);
        let message = err.message;
        if (err.name === 'TypeError') {
            message = 'Network error — unable to reach the weather API or proxy. Check the browser console for details.';
        }
        showError(message);
    }
}

stationSelect.addEventListener('change', (e) => {
    const code = e.target.value;
    if (code) {
        // Defer hash change to avoid Firefox "Permission denied" errors
        // when SelectChild is still handling the dropdown.
        setTimeout(() => { window.location.hash = code; }, 0);
    } else {
        history.pushState('', document.title, window.location.pathname + window.location.search);
        loading.classList.add('hidden');
        errorDiv.classList.add('hidden');
        weatherContainer.classList.add('hidden');
    }
});

window.addEventListener('hashchange', () => {
    const code = window.location.hash.slice(1);
    if (code && stationSelect.value !== code) {
        stationSelect.value = code;
    }
    loadStation(code);
});

populateDropdown();

const initialCode = window.location.hash.slice(1);
if (initialCode) {
    stationSelect.value = initialCode;
    loadStation(initialCode);
}

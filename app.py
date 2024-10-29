from flask import Flask, render_template, request
import requests
import json
from datetime import datetime

app = Flask(__name__)

# Dictionary of available station codes
TV_STATIONS = {
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
    "KUTH": "00000171-32da-d154-ab7d-33fbed240021",
    "KHRR": "KHRR"  # Added KHRR
}

def get_weather_data(tv_station):
    url = "https://graphql.univision.com/"
    headers = {"Content-Type": "application/json"}
    query = {
        "query": """query getForecastByTVStation($language: WeatherForecastLanguage!, $tvStation: TvStation!) { 
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
                    }""",
        "variables": {
            "tvStation": tv_station,
            "language": "ES"
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(query))
    if response.status_code == 200:
        weather_data = response.json()['data']['getWeatherForecastByTvStation']
        for forecast in weather_data['forecasts']['daily']:
            forecast['formattedDate'] = datetime.strptime(forecast['localeTime'], '%Y-%m-%dT%H:%M:%S').strftime('%m-%d-%Y')
        return weather_data
    else:
        return None

def get_telemundo_weather_data(zip_code):
    url = f"https://www.telemundoarizona.com/el-tiempo/latest.json/?zipCode={zip_code}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        return None

@app.route('/<tv_station>')
def index(tv_station):
    if tv_station == 'KHRR':
        weather_data = get_telemundo_weather_data('85720')  # Use the appropriate zip code for KHRR
        if weather_data:
            current = weather_data['current_observation']
            current_high = current['hiTempF']
            current_low = current['loTempF']
            current_precip_type = current.get('precipType', 'N/A')
            current_precip_percent = current['precip']
            current_phrase = current['phraseDay']
            
            # Format forecasts for template
            forecasts = []
            for day in weather_data['daily_forecast']:
                forecasts.append({
                    'formattedDate': datetime.strptime(day['time']['local_date'], '%m/%d/%Y %I:%M:%S %p').strftime('%m-%d-%Y'),
                    'icon': day['iconCode'],
                    'precipChance': day['precip'],
                    'precipType': day['daypart']['day'].get('precipType', 'N/A'),
                    'phrase': day['daypart']['day']['wxPhraseLong'],
                    'minTempF': day['loTempF'],
                    'maxTempF': day['hiTempF']
                })
            
            return render_template('index.html', 
                                   forecasts=forecasts, 
                                   tv_station=tv_station, 
                                   high=current_high, 
                                   low=current_low, 
                                   precip_type=current_precip_type, 
                                   precip_chance=current_precip_percent, 
                                   phrase=current_phrase)
        else:
            return "Error retrieving weather data for KHRR"
    elif tv_station in TV_STATIONS:
        weather_data = get_weather_data(tv_station)
        if weather_data:
            current_high = weather_data['maxTempF']
            current_low = weather_data['minTempF']
            current_precip_type = weather_data['precipType']
            current_precip_percent = weather_data['precipChance']
            current_phrase = weather_data['phrase']
            forecasts = weather_data['forecasts']['daily']
            return render_template('index.html', 
                                   forecasts=forecasts, 
                                   tv_station=tv_station, 
                                   high=current_high, 
                                   low=current_low, 
                                   precip_type=current_precip_type, 
                                   precip_chance=current_precip_percent, 
                                   phrase=current_phrase)
        else:
            return "Error retrieving weather data"
    else:
        return "Invalid TV Station Code"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
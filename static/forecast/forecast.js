var FORECAST = {
    /** Текущий geoID города  */
    currentTownGeoid: 4,

    /**
     * Кеш данных полученых от API.
     * Кешируется, как переход по городу в саджесте, так и при клике на метке.
     */
    townsCache: {},

    /**
     * Цвета для блока погоды
     */
    colors: {
        '-60': '#519fdd',
        '-58': '#56a2dd',
        '-56': '#5ba5de',
        '-54': '#60a7de',
        '-52': '#66aadf',
        '-50': '#6bade0',
        '-48': '#70afe0',
        '-46': '#76b2e1',
        '-44': '#7bb5e2',
        '-42': '#80b7e2',
        '-40': '#86bae3',
        '-38': '#8bbde3',
        '-36': '#90bfe4',
        '-34': '#95c2e5',
        '-32': '#9bc5e5',
        '-30': '#a0c7e6',
        '-28': '#a0c7e6',
        '-26': '#abcde7',
        '-24': '#b0cfe8',
        '-22': '#b5d2e9',
        '-20': '#bbd5e9',
        '-18': '#c0d7ea',
        '-16': '#c5daea',
        '-14': '#caddeb',
        '-12': '#d0dfec',
        '-10': '#d5e2ec',
        '-8': '#dae5ed',
        '-6': '#e0e7ee',
        '-4': '#e5eaee',
        '-2': '#eaedef',
        '0': '#f0eff0',
        '+2': '#f0f0ec',
        '+4': '#f1f0e9',
        '+6': '#f2f0e6',
        '+8': '#f3f1e3',
        '+10': '#f4f1e0',
        '+12': '#f5f2dc',
        '+14': '#f5f2d9',
        '+16': '#f6f3d6',
        '+18': '#f7f3d3',
        '+20': '#f8f4d0',
        '+22': '#f8f1c8',
        '+24': '#f9eec0',
        '+26': '#f9ebb9',
        '+28': '#f9e8b1',
        '+30': '#fae5aa',
        '+32': '#fae3a3',
        '+34': '#fae09c',
        '+36': '#fbde96',
        '+38': '#fbdb8f',
        '+40': '#fbd988',
        '+42': '#fcd682',
        '+44': '#fcd47b',
        '+46': '#fcd174',
        '+48': '#fdcf6e',
        '+50': '#fdcc67',
        '+52': '#fdca60',
        '+54': '#fec759',
        '+56': '#fec553',
        '+58': '#fec24c',
        '+60': '#ffc045'
    },

    /**
     * Получаем GeoID от geolocation и получаем данные прогноза
     * или получаем данные прогноза для дефолтного города
     */
    setCurrentGeoid: function () {
        $('.overflow').removeClass('hidden');

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                $.get('http://ekb.shri14.ru/api/geocode?coords=' +
                        position.coords.longitude + ',' +
                        position.coords.latitude).then(function (response) {
                        window.location.hash = '#geoid=' + response.geoid;
                        FORECAST.currentTownGeoid = response.geoid;
                        FORECAST.getForecastByGeoid(FORECAST.currentTownGeoid);
                    });
            }, function () {
                FORECAST.getForecastByGeoid(FORECAST.currentTownGeoid);
            });
        } else {
            FORECAST.getForecastByGeoid(FORECAST.currentTownGeoid);
        }
    },

    /**
     * Получение прогноза с API по geoid города
     * @param geoid GeoId города
     */
    getForecastByGeoid: function (geoid) {
        if (!FORECAST.townsCache[geoid]) {
            $.get('http://ekb.shri14.ru/api/localities/' + geoid).then(function (response) {
                    FORECAST.townsCache[response.info.geoid] = response;
                    FORECAST.setDataToForecast();
                }
            );
        } else {
            FORECAST.setDataToForecast();
        }
    },

    /**
     * Получаем GeoId из хеша урла
     */
    getForecastFromHash: function () {
        setTimeout( function () {
            FORECAST.currentTownGeoid = window.location.hash.split('#geoid=')[1];
            FORECAST.getForecastByGeoid(FORECAST.currentTownGeoid);
        }, 1); // без таймаута не хочет получать хеш :(
    },

    /**
     * Вставляем данные в страницу, центрируем карту на текущий город
     */
    setDataToForecast: function () {
        var forecastData = FORECAST.townsCache[FORECAST.currentTownGeoid];

        $('[data-field]').each(function () {
            var tempFD = forecastData,
                fields = $(this).attr('data-field').split('.');

            for (var i = 0, k = fields.length; i < k; i++) {
                tempFD = tempFD[fields[i]];
            }

            switch ($(this).attr('data-mod')) {
                case 'title':
                    tempFD = 'Погода ' + tempFD;
                    $(this).text(tempFD);
                    break;

                case 'km':
                    tempFD = Math.round(tempFD * 3.6 * 10)/10;
                    $(this).text(tempFD);
                    break;

                case 'bkg':
                    var index = tempFD - tempFD % 2;
                    index = index > 0 ? '+' + index : index;
                    $(this).css('background-color', FORECAST.colors[index]);
                    break

                case 'src':
                    $(this).attr('src', 'http://ekb.shri14.ru/icons/' + tempFD + '.svg');
                    break;

                default:
                    $(this).text(tempFD);
            }
        });

        $('.overflow').addClass('hidden');

        if (!MAP.map) {
            ymaps.ready(function () {
                MAP.init([forecastData.info.lat, forecastData.info.lon], 10);
            });
        } else {
            MAP.map.setCenter([forecastData.info.lat, forecastData.info.lon]);
            MAP.map.setZoom(10);
        }
    },

    /**
     * Инициализация FORECAST
     */
    init: function () {
        /* Скрываем блоки с погодой, которая уже была */
        var hoursNow = (new Date()).getHours();

        if (hoursNow >= 12 && hoursNow < 18) {
            /* Скрываем "день" */
            $('.forecast__item.item-day').addClass('hidden');
        } else if (hoursNow >= 12 && hoursNow < 18) {
            /* Скрываем "вечер" */
            $('.forecast__item.item-evening').addClass('hidden');
        } else if (hoursNow >= 18 && hoursNow < 1) {
            /* Скрываем "ночь" */
            $('.forecast__item.item-night').addClass('hidden');
        }

        /* Инициализируем погодные данные */
        if (window.location.hash.indexOf('geoid') !== -1) {
            FORECAST.getForecastFromHash();
        } else {
            FORECAST.setCurrentGeoid();
        }
    }
};
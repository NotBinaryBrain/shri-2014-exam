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
        if (window.location.hash.indexOf('geoid') !== -1) {
            FORECAST.getForecastFromHash();
        } else {
            FORECAST.setCurrentGeoid();
        }
    }
};

var MAP = {
    /** Кэш меток */
    apiBoundsCache: {},

    /** Инициализация лэйаутов, карты и кластеризатора */
    init: function (coords, zoom) {
        // Инициализируем лэйауты
        MAP.iContentLayout = ymaps.templateLayoutFactory.createClass(
            '<div class="baloon ymaps-placemark">' +
                '<a class="link" href="#">' +
                    '<i class="icon icon_size_30 baloon__icon" data-width="30" style=' +
                        '"background-image: url(\'http://ekb.shri14.ru/icons/$[properties.weather_icon].svg\')">' +
                    '</i>' +
                    '<span class="baloon__temp">$[properties.temp]</span>' +
                '</a>' +
            '</div>'
        );

        MAP.hContentLayout = ymaps.templateLayoutFactory.createClass(
            '<b class="hint">$[properties.name]</b>', {
                /* Для того, чтобы хинт плавал над меткой */
                getShape: function () {
                    var el = this.getElement(),
                        result = null;
                    if (el) {
                        var firstChild = el.firstChild;
                        result = new ymaps.shape.Rectangle(
                            new ymaps.geometry.pixel.Rectangle([
                                [0, 0],
                                [firstChild.offsetWidth, firstChild.offsetHeight]
                            ])
                        );
                    }
                    return result;
                }
            }
        );

        MAP.bContentLayout = ymaps.templateLayoutFactory.createClass(
            '<div>$[properties.balloon]</div>'
        );

        // Основные объекты
        // Инициализация карты
        MAP.map = new ymaps.Map('map', {
            center: coords ? coords : [55.650625, 37.62708],
            zoom: zoom ? zoom : 10,
            controls: ['zoomControl', 'fullscreenControl', 'typeSelector']
        }, {
            minZoom: 5,
            maxZoom: 17
        });

        MAP.map.behaviors.disable('scrollZoom');
        MAP.map.events.add('boundschange', MAP.getNewDataOnBounds);
        MAP.getNewDataOnBounds();

        // Инициализируем кластиризатор
        MAP.clusterer = new ymaps.Clusterer({
            groupByCoordinates: false,
            clusterIconLayout: MAP.iContentLayout,
            clusterIconOffset: [-22, -40],
            clusterIconShape: MAP.getIconShape(),
            gridSize: 128,
            clusterOpenBalloonOnClick: false
        });

        MAP.clusterer.origCreateCluster = MAP.clusterer.createCluster;
        MAP.clusterer.createCluster = function (e, n) {
            var obj = MAP.clusterer.origCreateCluster(e, n),
                props = obj.getGeoObjects()[0].properties.getAll();
            return obj.properties.set({
                geoid: props.geoid,
                temp: props.temp,
                weather_icon: props.weather_icon,
                lat: props.lat,
                lon: props.lon,
                name: props.name,
                balloon: props.balloon
            }), obj
        };

        // Повесили обработчик на клик по "Подробнее" в метке
        $('.map').on('click', '.map__link', function () {
            $('.overflow').removeClass('hidden');
            FORECAST.getForecastFromHash();
        });
    },

    /** Получаем метки для нового баундса */
    getNewDataOnBounds: function () {
        var params   = MAP.convertToParams( MAP.map.getBounds(), MAP.map.getZoom()),
            cacheKey = MAP.escapeParams(params);

        if (!MAP.apiBoundsCache[cacheKey]) {
            $.get('http://ekb.shri14.ru/api/map-data', params).then(function (response) {
                    if (response.length > 0) {
                        MAP.apiBoundsCache[cacheKey] = response;
                        MAP.makePlacemarks(MAP.apiBoundsCache[cacheKey]);
                    }
                }
            );
        } else {
            MAP.makePlacemarks(MAP.apiBoundsCache[cacheKey]);
        }
    },

    /**
     * Создаём метки по данным и добавляем в кластеризатор
     * @param data
     */
    makePlacemarks: function (data) {
        var geoObjects = [],
            v = 0,
            placemarks = MAP.clusterer.getGeoObjects();

        for (var i = 0, l = data.length; i < l; i++) {
            var coords = [data[i].lat, data[i].lon];

            if (!MAP.checkPlacemarkIn(placemarks, coords)) {
                data[i].balloon = '<div class="spinner"></div>';

                var currentMark = new ymaps.Placemark(coords, data[i], MAP.getPointOptions());
                geoObjects[v++] = currentMark;

                currentMark.events.add('click', function (e) {
                    var plm = e.get('target');

                    if (plm.properties.get('balloon').indexOf('spinner') !== -1) {

                        $.get('http://ekb.shri14.ru/api/localities/' +
                            plm.properties.get('geoid')).then(function (response) {
                                FORECAST.townsCache[response.info.geoid] = response;
                                plm.properties.set('balloon', MAP.makeBalloonContent(response));
                                plm.balloon.open();
                            }
                        );

                    }

                    return true;
                });
            }
        }

        if (geoObjects.length) {
            MAP.clusterer.add(geoObjects);
            MAP.map.geoObjects.add(MAP.clusterer);
        }
    },

    /**
     * Получаем IconShape
     * @returns {{type: string, coordinates: Array}}
     */
    getIconShape: function () {
        return {
            type: 'Rectangle',
            coordinates: [
                [-22, -40],
                [48, 2]
            ]
        };
    },

    /** Получаем настройки плейсмарка */
    getPointOptions: function () {
        return {
            balloonContentLayout: MAP.bContentLayout,
            hintLayout:           MAP.hContentLayout,
            iconLayout:           MAP.iContentLayout,
            iconOffset:           [-22, -40],
            iconShape: MAP.getIconShape(),
            openBalloonOnClick: true
        };
    },

    /**
     * Проверяем есть ли метка в кластере
     * @param placemarks Все метки в кластере
     * @param coords Координтаты метки
     * @returns {boolean} true, если метка есть в кластере
     */
    checkPlacemarkIn: function (placemarks, coords) {
        for (var l = placemarks.length; l--;) {
            if (placemarks[l].geometry.getCoordinates()[0] === coords[0] &&
                placemarks[l].geometry.getCoordinates()[1] === coords[1])
                return true;
        }
        return false;
    },

    /**
     * Создание ключа массива для кэширования данных с API
     * @param params
     * @returns {string}
     */
    escapeParams: function (params) {
    var result = '';
    for (var i in params) {
        result += params[i].toString().replace(new RegExp('[,.]','g'),'_') + '__';
    }
    result = result.substr(0, result.length - 2);

    return result;
},

    /**
     * Округление координат до чётрных минут с одним знаком после запятой. — Меньше запросов к API
     * @param number Координата до округления
     * @returns {number}
     */
    roundCoord: function (number) {
        var biggerNumber = Math.ceil(number * 10),
            result = biggerNumber % 2 ? biggerNumber - 1 : biggerNumber;
        return result / 10;
    },

    /**
     * Создаём объект с данными для $.get запроса на получение меток баундса
     * @param bounds Баунд карты
     * @param zoom Зум карты
     * @returns {{lt: string, rb: string, zoom: *}}
     */
    convertToParams: function (bounds, zoom) {
        return {
            lt: [MAP.roundCoord(bounds[0][1]), MAP.roundCoord(bounds[1][0])].join(','),
            rb: [MAP.roundCoord(bounds[1][1]), MAP.roundCoord(bounds[0][0])].join(','),
            zoom: zoom
        }
    },

    /**
     * Создаём разметку с данными для балуна
     * @param response
     * @returns {string}
     */
    makeBalloonContent: function (response) {
        return '<h3>' + response.info.name + '</h3>' +
            response.fact.temp + '°C, ' + response.fact.weather + '<br/>' +
            'Ветер: ' + response.fact.wind_speed + 'м/с ' + response.fact.wind + '<br/>' +
            'Влажность: ' + response.fact.humidity + '%<br/>' +
            'Давление: ' + response.fact.pressure + 'мм рт. ст.<br/>' +
            '<p><a class="map__link" href="#geoid=' + response.info.geoid + '">Подробнее</a></p>';
    }
};

var SUGGEST = {

    /**
     * Получаем города по началу названия
     * @param nameStart кусок названия города
     */
    getSuggestedTowns: function (nameStart) {
        var suggestWrapper = $('.header__suggest'),
            suggestList = $('.suggest__list');

        if (!nameStart.length) {
            suggestWrapper.addClass('hidden');
            suggestList.html('');
        } else {

            var params = {
                query: nameStart,
                maxlen: 10
            };

            $.get('http://ekb.shri14.ru/api/suggest', params).then(function (response) {
                    suggestWrapper.addClass('hidden');
                    suggestList.html('');

                    if (response.length) {
                        var els = document.createDocumentFragment();
                        response.forEach(function (e) {
                            var temp = document.createElement('template');
                            temp.innerHTML = '<li class="suggest__item">' +
                                '<a href="#geoid=' + e.geoid + '">' + e.name + ', ' + e.country + '</a>' +
                                '</li>';
                            els.appendChild(temp.content);
                        });

                        suggestList.html(els);
                        suggestWrapper.removeClass('hidden');
                    }
                }
            );
        }
    },

    /**
     * Инициализация обработчиков событий
     */
    init: function () {
        $('.search .input__control').keyup(function () {
            SUGGEST.getSuggestedTowns(this.value);
        });

        $('.search .input__control').focusout(function () {
            setTimeout(function () {
                $('.header__suggest').addClass('hidden');
                $('.suggest__list').html('');
            }, 100);
        });

        $('.search').submit(function (e) {
            e.preventDefault();
            SUGGEST.getSuggestedTowns($('.search .input__control').val());
        });

        $('.suggest__list').on('click', '.suggest__item a', function () {
            $('.overflow').removeClass('hidden');
            $('.search .input__control').val('');
            FORECAST.getForecastFromHash();
        });
    }

};

FORECAST.init();
SUGGEST.init();

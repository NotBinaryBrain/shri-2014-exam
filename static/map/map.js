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
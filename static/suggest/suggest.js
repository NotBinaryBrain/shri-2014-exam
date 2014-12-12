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
                                '<a href="#geoid=' + e.geoid + '" tabindex="0">' + e.name + ', ' + e.country + '</a>' +
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
            }, 300);
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
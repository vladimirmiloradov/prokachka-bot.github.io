
(() => {
    const KEY = 'custom_timer_seconds_v2';

    const saved = Number(localStorage.getItem(KEY));
    let duration = Number.isInteger(saved) && saved >= 1 && saved <= 86400
        ? saved
        : 600;

    let remaining = duration;
    let interval = null;

    // Формат времени ММ:СС
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    function mountTimer() {
        const host = document.getElementById('topActiveV168');

        if (!host || host.querySelector('.custom-timer')) {
            return;
        }

        host.classList.add('custom-timer-host');

        const panel = document.createElement('div');
        panel.className = 'custom-timer';

        panel.innerHTML = `
            <div class="custom-timer-title">
                ТАЙМЕР
            </div>

            <div class="custom-timer-clock">
                ${formatTime(remaining)}
            </div>

            <div class="custom-timer-actions">
                <button type="button" class="timer-start">
                    СТАРТ
                </button>

                <button type="button" class="timer-stop">
                    СТОП
                </button>
            </div>

            <label class="custom-timer-label" for="timer-duration">
                Выставить время (секунды)
            </label>

            <div class="custom-timer-setting">
                <input
                    id="timer-duration"
                    type="number"
                    min="1"
                    max="86400"
                    step="1"
                    value="${duration}"
                >

                <button type="button" class="timer-apply">
                    УСТАНОВИТЬ
                </button>
            </div>
        `;

        // Удаляем старый ТОП-3 и вставляем таймер
        host.replaceChildren(panel);

        const clock = panel.querySelector('.custom-timer-clock');
        const input = panel.querySelector('#timer-duration');

        const startButton = panel.querySelector('.timer-start');
        const stopButton = panel.querySelector('.timer-stop');
        const applyButton = panel.querySelector('.timer-apply');

        function updateClock() {
            clock.textContent = formatTime(remaining);
        }

        function stopInterval() {
            if (interval !== null) {
                clearInterval(interval);
                interval = null;
            }
        }

        // Кнопка СТАРТ
        startButton.addEventListener('click', () => {
            if (interval !== null) return;

            if (remaining <= 0) {
                remaining = duration;
            }

            updateClock();

            interval = setInterval(() => {
                remaining = Math.max(0, remaining - 1);
                updateClock();

                if (remaining === 0) {
                    stopInterval();
                }
            }, 1000);
        });

        // Кнопка СТОП
        stopButton.addEventListener('click', () => {
            stopInterval();
            remaining = duration;
            updateClock();
        });

        // Кнопка УСТАНОВИТЬ
        applyButton.addEventListener('click', () => {
            const value = Number(input.value);

            if (
                !Number.isInteger(value) ||
                value < 1 ||
                value > 86400
            ) {
                input.setCustomValidity(
                    'Введите от 1 до 86400 секунд'
                );
                input.reportValidity();
                return;
            }

            input.setCustomValidity('');

            stopInterval();

            duration = value;
            remaining = value;

            localStorage.setItem(KEY, String(value));

            updateClock();
        });

        input.addEventListener('input', () => {
            input.setCustomValidity('');
        });
    }

    function initialize() {
        mountTimer();

        // Восстанавливаем таймер, если сайт
        // перерисовывает исходный блок
        const observer = new MutationObserver(() => {
            const timer = document.querySelector(
                '#topActiveV168 .custom-timer'
            );

            if (!timer) {
                mountTimer();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();

// script.js

// !!! ВАЖНО: Сюда нужно будет вставить URL, который выдаст ngrok !!!
const API_URL = "http://95.46.48.75:8000/api/data";


document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready(); // Сообщаем Telegram, что приложение готово

    const loadingDiv = document.getElementById('loading');
    const builderDiv = document.getElementById('builder');
    const speciesSelect = document.getElementById('species-select');
    const itemSelect = document.getElementById('item-select');
    const movesSelect = document.getElementById('moves-select');
    const submitButton = document.getElementById('submit-button');
    
    let GAME_DATA = null;

    // 1. Загружаем данные с нашего бэкенда
    fetch(API_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            GAME_DATA = data;
            console.log("Данные успешно загружены:", GAME_DATA);
            initializeApp();
        })
        .catch(error => {
            loadingDiv.textContent = `Ошибка загрузки данных: ${error.message}. Убедитесь, что сервер и ngrok запущены, и URL в script.js верный.`;
            loadingDiv.style.color = 'red';
        });

    // 2. Инициализируем приложение после загрузки данных
    function initializeApp() {
        loadingDiv.style.display = 'none';
        builderDiv.style.display = 'block';

        // Заполняем список покемонов
        for (const speciesId in GAME_DATA.species) {
            const option = document.createElement('option');
            option.value = speciesId;
            option.textContent = GAME_DATA.species[speciesId].name;
            speciesSelect.appendChild(option);
        }

        // Заполняем список предметов
        GAME_DATA.items.forEach(itemId => {
            const option = document.createElement('option');
            option.value = itemId;
            option.textContent = itemId;
            itemSelect.appendChild(option);
        });

        // Привязываем событие: при смене покемона обновлять список атак
        speciesSelect.addEventListener('change', updateMovesForSelectedSpecies);
        
        // Вызываем один раз, чтобы заполнить атаки для первого покемона в списке
        updateMovesForSelectedSpecies();
    }
    
    // 3. Функция обновления списка атак
    function updateMovesForSelectedSpecies() {
        const selectedSpeciesId = speciesSelect.value;
        const speciesData = GAME_DATA.species[selectedSpeciesId];
        
        // Очищаем старый список
        movesSelect.innerHTML = '';

        if (speciesData && speciesData.moves) {
            speciesData.moves.forEach(moveId => {
                const moveData = GAME_DATA.moves[moveId];
                if (moveData) {
                    const option = document.createElement('option');
                    option.value = moveId;
                    option.textContent = `${moveData.name} (${moveData.type}, ${moveData.power})`;
                    movesSelect.appendChild(option);
                }
            });
        }
    }

    // 4. Отправка результата в Telegram
    submitButton.addEventListener('click', () => {
        const selectedMoves = Array.from(movesSelect.selectedOptions).map(opt => opt.value);

        if (selectedMoves.length > 4) {
            alert("Можно выбрать не более 4 атак!");
            return;
        }

        // Собираем финальный объект
        const result = {
            species: speciesSelect.value,
            item: itemSelect.value,
            moves: selectedMoves,
        };
        
        // Отправляем данные боту в виде строки JSON
        tg.sendData(JSON.stringify(result));
        
        // Закрываем веб-приложение
        tg.close();
    });
});


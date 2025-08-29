// script.js

// Используйте эту строку для локального теста (с правкой файла hosts)
const API_URL = "https://api.monster-bot.ru/api/data";

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready();

    // --- НАСТРАИВАЕМ ГЛАВНУЮ КНОПКУ ---
    tg.MainButton.setText("Сформировать команды");
    tg.MainButton.show();
    // Назначаем нашу функцию-отправщик на клик по этой кнопке
    tg.MainButton.onClick(submitTeams);
    // ---

    const loadingDiv = document.getElementById('loading');
    const builderDiv = document.getElementById('builder');
    // Старая HTML-кнопка нам больше не нужна
    // const submitButton = document.getElementById('submit-button');
    
    let GAME_DATA = null;
    // --- 1. Загрузка данных ---
    fetch(API_URL)
        .then(response => response.ok ? response.json() : Promise.reject(new Error(`Ошибка сети: ${response.status}`)))
        .then(data => {
            GAME_DATA = data;
            initializeApp();
        })
        .catch(error => {
            loadingDiv.textContent = `Ошибка загрузки данных: ${error.message}. Убедитесь, что локальный сервер запущен.`;
            loadingDiv.style.color = 'red';
            tg.MainButton.hide();
        });

    // --- 2. Инициализация приложения ---
    function initializeApp() {
    loadingDiv.style.display = 'none';
    builderDiv.style.display = 'block';

    // --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
    // Получаем контейнеры для кнопок и содержимого
        const teamContainers = [
            { buttons: document.getElementById('team-1-tab-buttons'), contents: document.getElementById('team-1-tab-contents') },
            { buttons: document.getElementById('team-2-tab-buttons'), contents: document.getElementById('team-2-tab-contents') }
        ];

        teamContainers.forEach((container, teamIndex) => {
            for (let i = 0; i < 6; i++) {
                // Создаем кнопку-таб
                const button = document.createElement('button');
                button.className = 'tab-button';
                button.textContent = `Покемон ${i + 1}`;
                button.dataset.slotId = i; // Связываем кнопку со слотом по ID

                // Создаем сам слот (как и раньше, но он будет скрыт по CSS)
                const slot = createPokemonSlot(teamIndex + 1, i);

                // Делаем первый таб и слот активными по умолчанию
                if (i === 0) {
                    button.classList.add('active');
                    slot.classList.add('active');
                }

                // Добавляем обработчик клика на кнопку
                button.addEventListener('click', (event) => {
                    // Убираем 'active' у всех кнопок и слотов в этой команде
                    container.buttons.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                    container.contents.querySelectorAll('.pokemon-slot').forEach(slt => slt.classList.remove('active'));

                    // Добавляем 'active' только нажатой кнопке и её слоту
                    event.target.classList.add('active');
                    slot.classList.add('active');
                });

                // Добавляем созданные элементы на страницу
                container.buttons.appendChild(button);
                container.contents.appendChild(slot);
            }
        });

    submitButton.addEventListener('click', submitTeams);
    }

    // --- 3. Функция для создания одного слота покемона ---
    function createPokemonSlot(teamId, slotId) {
        const slot = document.createElement('div');
        slot.className = 'pokemon-slot';
        slot.dataset.teamId = teamId;
        slot.dataset.slotId = slotId;

        // --- Выбор вида покемона ---
        const speciesLabel = document.createElement('label');
        speciesLabel.textContent = `Покемон #${slotId + 1}`;
        const speciesSelect = document.createElement('select');
        speciesSelect.className = 'species-select';

        // --- НОВЫЙ БЛОК: Уровень ---
        const levelLabel = document.createElement('label');
        levelLabel.textContent = 'Уровень:';
        const levelInput = document.createElement('input');
        levelInput.className = 'level-input';
        levelInput.type = 'number';
        levelInput.value = 100;
        levelInput.min = 1;
        levelInput.max = 100;

        const abilityLabel = document.createElement('label');
        abilityLabel.textContent = 'Способность:';
        const abilitySelect = document.createElement('select');
        abilitySelect.className = 'ability-select';

        // Добавляем пустую опцию, чтобы слот мог быть неактивным
        const emptyOption = new Option("--- Не выбрано ---", "");
        speciesSelect.appendChild(emptyOption);

        for (const speciesId in GAME_DATA.species) {
            speciesSelect.appendChild(new Option(GAME_DATA.species[speciesId].name, speciesId));
        }

        // --- Выбор предмета ---
        const itemLabel = document.createElement('label');
        itemLabel.textContent = `Предмет:`;
        const itemSelect = document.createElement('select');
        itemSelect.className = 'item-select';
        GAME_DATA.items.forEach(itemId => {
            itemSelect.appendChild(new Option(itemId, itemId));
        });

        // --- Выбор атак ---
        const movesLabel = document.createElement('label');
        movesLabel.textContent = `Атаки (до 4):`;
        const movesSelect = document.createElement('select');
        movesSelect.className = 'moves-select';
        movesSelect.multiple = true;

        // --- Собираем всё вместе ---
        slot.append(speciesLabel, speciesSelect, levelLabel, levelInput, abilityLabel, abilitySelect, itemLabel, itemSelect, movesLabel, movesSelect);

        // --- Логика обновления атак при смене покемона ---
        speciesSelect.addEventListener('change', () => {
        const selectedSpeciesId = speciesSelect.value;
        movesSelect.innerHTML = '';
        abilitySelect.innerHTML = ''; // Очищаем и способности

        if (selectedSpeciesId) {
            const speciesData = GAME_DATA.species[selectedSpeciesId];
            // Обновляем атаки
            if (speciesData?.moves) {
                speciesData.moves.forEach(moveId => {
                    const moveData = GAME_DATA.moves[moveId];
                    if (moveData) movesSelect.appendChild(new Option(`${moveData.name} (${moveData.type})`, moveId));
                });
            }
            // Обновляем способности
            if (speciesData?.abilities) {
                speciesData.abilities.forEach(abilityId => {
                    abilitySelect.appendChild(new Option(abilityId, abilityId));
                });
            }
        }
    });

        return slot;
    }

    // --- 4. Функция сбора и отправки данных ---
    function submitTeams() {

        // Делаем кнопку неактивной, чтобы избежать двойных нажатий
        tg.MainButton.showProgress();
        tg.MainButton.disable();    
        const teams = {
            team1: [],
            team2: []
        };
    
        const allSlots = document.querySelectorAll('.pokemon-slot');
    
        try {
            allSlots.forEach(slot => {
                const species = slot.querySelector('.species-select').value;
                if (species) {
                    const selectedMoves = Array.from(slot.querySelector('.moves-select').selectedOptions).map(opt => opt.value);
    
                    if (selectedMoves.length > 4) {
                        // Используем более наглядное оповещение
                        const pokemonName = GAME_DATA.species[species].name;
                        alert(`Ошибка: У покемона ${pokemonName} выбрано больше 4 атак!`);
                        slot.style.border = '2px solid red';
                        // Прерываем выполнение функции, чтобы пользователь мог исправить
                        throw new Error("Too many moves selected");
                    }
                    slot.style.border = '1px solid #ddd';
    
                    const pokemonData = {
                        species: species,
                        level: parseInt(slot.querySelector('.level-input').value, 10) || 100,
                        ability: slot.querySelector('.ability-select').value || null,
                        item: slot.querySelector('.item-select').value || null,
                        moves: selectedMoves,
                    };
    
                    if (slot.dataset.teamId === "1") {
                        teams.team1.push(pokemonData);
                    } else {
                        teams.team2.push(pokemonData);
                    }
                }
            });
    
            if (teams.team1.length === 0 || teams.team2.length === 0) {
                alert("Каждая команда должна иметь хотя бы одного покемона.");
                return;
            }
    
            // --- ГЛАВНЫЕ ИЗМЕНЕНИЯ ЗДЕСЬ ---
            const tg = window.Telegram.WebApp;
    
            // 1. Отправляем данные боту в виде строки JSON
            tg.sendData(JSON.stringify(teams));
    
            // 2. Закрываем окно веб-приложения
            tg.close();
    
        } catch (e) {
            // Если была ошибка (например, выбрано слишком много атак),
            // мы просто прерываем выполнение, чтобы не закрывать окно.
            console.error(e.message);
            tg.MainButton.hideProgress();
            tg.MainButton.enable();
    }
}
});



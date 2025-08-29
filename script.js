// script.js

const API_URL = "https://api.monster-bot.ru/api/data";

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready();

    const isBrowser = tg.platform === 'unknown' || !tg.platform;
    // --- 1. ОПРЕДЕЛЯЕМ РЕЖИМ РАБОТЫ (PVE или PVP) ---
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'pve'; // По умолчанию pve, если параметр не указан

    const browserButton = document.getElementById('submit-button');
    
     if (isBrowser) {
        // Если мы в браузере, делаем нашу HTML-кнопку видимой и вешаем на нее событие
        browserButton.style.display = 'block';
        browserButton.addEventListener('click', submitTeams);
    } else {
        // Если мы в Телеграме, скрываем HTML-кнопку и настраиваем кнопку Телеграма
        browserButton.style.display = 'none';
        tg.MainButton.setText(mode === 'pvp' ? "Отправить мою команду" : "Сформировать команды");
        tg.MainButton.onClick(submitTeams);
    }

    const loadingDiv = document.getElementById('loading');
    const builderDiv = document.getElementById('builder');
    const team2Container = document.querySelector('.team-container:nth-child(2)'); // Находим контейнер второй команды
    let GAME_DATA = null;

    fetch(API_URL)
        .then(response => {
            if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
            return response.json();
        })
        .then(data => {
            GAME_DATA = data;
            initializeApp();
        })
        .catch(error => {
            loadingDiv.textContent = `Ошибка загрузки данных: ${error.message}.`;
            loadingDiv.style.color = 'red';
            tg.MainButton.hide();
        });

    function initializeApp() {
        loadingDiv.style.display = 'none';
        builderDiv.style.display = 'block';

        // --- 2. ЛОГИКА ОТОБРАЖЕНИЯ В ЗАВИСИМОСТИ ОТ РЕЖИМА ---
        if (mode === 'pvp') {
            document.querySelector('h1').textContent = 'Выбор команды для PvP';
            if (team2Container) {
                team2Container.style.display = 'none'; // Скрываем блок второй команды
            }
        }

        const teamContainers = [
            { buttons: document.getElementById('team-1-tab-buttons'), contents: document.getElementById('team-1-tab-contents') }
        ];
        // Если режим pve, добавляем вторую команду
        if (mode === 'pve') {
            teamContainers.push(
                { buttons: document.getElementById('team-2-tab-buttons'), contents: document.getElementById('team-2-tab-contents') }
            );
        }
        
        // Создаем табы и слоты
        teamContainers.forEach((container, teamIndex) => {
            for (let i = 0; i < 6; i++) {
                // ... (весь ваш код для создания кнопок и слотов остается ЗДЕСЬ без изменений)
                const button = document.createElement('button');
                button.className = 'tab-button';
                button.textContent = `Покемон ${i + 1}`;
                button.dataset.slotId = i;

                const slot = createPokemonSlot(teamIndex + 1, i);
                
                if (i === 0) {
                    button.classList.add('active');
                    slot.classList.add('active');
                }

                button.addEventListener('click', (event) => {
                    container.buttons.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                    container.contents.querySelectorAll('.pokemon-slot').forEach(slt => slt.classList.remove('active'));
                    event.target.classList.add('active');
                    slot.classList.add('active');
                });

                container.buttons.appendChild(button);
                container.contents.appendChild(slot);
            }
        });
        
        // Добавляем слушатель на все изменения для проверки валидности
        builderDiv.addEventListener('change', checkFormValidity);
    }
    
    // Функция createPokemonSlot остается БЕЗ ИЗМЕНЕНИЙ

    function createPokemonSlot(teamId, slotId) {
        // ... (весь ваш код этой функции остается здесь)
        const slot = document.createElement('div');
        slot.className = 'pokemon-slot';
        slot.dataset.teamId = teamId;
        slot.dataset.slotId = slotId;

        // Поля для выбора
        const speciesLabel = document.createElement('label');
        speciesLabel.textContent = `Вид:`;
        const speciesSelect = document.createElement('select');
        speciesSelect.className = 'species-select';
        speciesSelect.appendChild(new Option("--- Не выбрано ---", ""));
        for (const speciesId in GAME_DATA.species) {
            speciesSelect.appendChild(new Option(GAME_DATA.species[speciesId].name, speciesId));
        }

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

        const itemLabel = document.createElement('label');
        itemLabel.textContent = `Предмет:`;
        const itemSelect = document.createElement('select');
        itemSelect.className = 'item-select';
        GAME_DATA.items.forEach(itemId => {
            itemSelect.appendChild(new Option(itemId, itemId));
        });
        
        const movesLabel = document.createElement('label');
        movesLabel.textContent = `Атаки (до 4):`;
        const movesSelect = document.createElement('select');
        movesSelect.className = 'moves-select';
        movesSelect.multiple = true;
        movesSelect.size = 4;

        slot.append(speciesLabel, speciesSelect, levelLabel, levelInput, abilityLabel, abilitySelect, itemLabel, itemSelect, movesLabel, movesSelect);

        // Обновление способностей и атак при смене вида
        speciesSelect.addEventListener('change', () => {
            const selectedSpeciesId = speciesSelect.value;
            movesSelect.innerHTML = ''; 
            abilitySelect.innerHTML = '';
            
            if (selectedSpeciesId) {
                const speciesData = GAME_DATA.species[selectedSpeciesId];
                if (speciesData?.abilities) {
                    speciesData.abilities.forEach(abilityId => {
                        abilitySelect.appendChild(new Option(abilityId, abilityId));
                    });
                }
                if (speciesData?.moves) {
                    speciesData.moves.forEach(moveId => {
                        const moveData = GAME_DATA.moves[moveId];
                        if (moveData) movesSelect.appendChild(new Option(`${moveData.name} (${moveData.type})`, moveId));
                    });
                }
            }
        });

        return slot;
    }

    function checkFormValidity() {
        const teams = { team1: [] };
        // Собираем только первую команду
        document.querySelectorAll('.pokemon-slot[data-team-id="1"]').forEach(slot => {
            const species = slot.querySelector('.species-select').value;
            if (species) {
                teams.team1.push(species);
            }
        });

        let isValid = false;
        if (mode === 'pvp') {
            // В PvP режиме достаточно хотя бы одного покемона в первой команде
            isValid = teams.team1.length > 0;
        } else {
            // В PvE режиме нужна и вторая команда
            teams.team2 = [];
            document.querySelectorAll('.pokemon-slot[data-team-id="2"]').forEach(slot => {
                const species = slot.querySelector('.species-select').value;
                if (species) {
                    teams.team2.push(species);
                }
            });
            isValid = teams.team1.length > 0 && teams.team2.length > 0;
        }

        if (isBrowser) {
            // В браузере показываем или прячем нашу HTML-кнопку
            browserButton.style.display = isValid ? 'block' : 'none';
        } else {
            // В Телеграме показываем или прячем кнопку Телеграма
            if (isValid) {
                tg.MainButton.show();
            } else {
                tg.MainButton.hide();
            }
        }
    
    }

    function submitTeams() {
        // ... (эта функция остается практически без изменений,
        // но теперь она будет собирать данные только из видимых полей)
        tg.MainButton.showProgress();
        tg.MainButton.disable();

        const teams = { team1: [], team2: [] };
        
        try {
        console.log("--- Начинаю сбор данных из слотов ---"); // <--- Начало отладки

        document.querySelectorAll('.pokemon-slot').forEach((slot, index) => {
            // Для каждого найденного слота...
            const teamId = slot.dataset.teamId;
            const speciesSelect = slot.querySelector('.species-select');
            const species = speciesSelect ? speciesSelect.value : 'НЕ НАЙДЕН';

            // --- ВЫВОДИМ В КОНСОЛЬ ВСЮ ИНФОРМАЦИЮ О СЛОТЕ ---
            console.log(`Слот #${index} | Команда: ${teamId} | Найденный вид: "${species}"`);

            if (species && species !== 'НЕ НАЙДЕН') {
                console.log(`   └-- Вид найден! Собираю данные для ${species}...`);
                // ... (остальная логика сбора данных для pokemonData без изменений)
                const selectedMoves = Array.from(slot.querySelector('.moves-select').selectedOptions).map(opt => opt.value);
                const pokemonData = {
                    species: species,
                    level: parseInt(slot.querySelector('.level-input').value, 10) || 100,
                    ability: slot.querySelector('.ability-select').value || null,
                    item: slot.querySelector('.item-select').value || null,
                    moves: selectedMoves,
                };
                
                const teamData = (teamId === "1") ? teams.team1 : teams.team2;
                teamData.push(pokemonData);
            }
        });

        console.log("--- Сбор данных завершен ---"); // <--- Конец отладки
            // В pvp режиме в объекте будет только team1
            const dataToSend = (mode === 'pvp') ? { team1: teams.team1 } : teams;

            console.log('ОТПРАВЛЯЮТСЯ ДАННЫЕ:', JSON.stringify(dataToSend));
            
            tg.sendData(JSON.stringify(dataToSend));
            // tg.close(); // Раскомментируйте, если хотите закрывать окно после отправки
            
        } catch (e) {
            console.error(e.message);
            tg.MainButton.hideProgress();
            tg.MainButton.enable();
        }
    }
});




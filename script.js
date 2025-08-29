// script.js

// URL вашего API на сервере. Убедитесь, что он правильный.
const API_URL = "https://api.monster-bot.ru/api/data";

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP ---
    const tg = window.Telegram.WebApp;
    tg.ready();

    // Настраиваем Главную Кнопку, но пока не показываем её.
    tg.MainButton.setText("Сформировать команды");
    tg.MainButton.onClick(submitTeams);

    // --- 2. ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ СТРАНИЦЫ ---
    const loadingDiv = document.getElementById('loading');
    const builderDiv = document.getElementById('builder');
    let GAME_DATA = null;

    // --- 3. ЗАГРУЗКА ИГРОВЫХ ДАННЫХ С БЭКЕНДА ---
    fetch(API_URL)
        .then(response => {
            if (!response.ok) {
                // Если сервер не отвечает, выводим ошибку
                throw new Error(`Ошибка сети: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            GAME_DATA = data;
            initializeApp(); // Если данные загружены, строим интерфейс
        })
        .catch(error => {
            // Если произошла ошибка, сообщаем пользователю и прячем кнопку
            loadingDiv.textContent = `Ошибка загрузки данных: ${error.message}.`;
            loadingDiv.style.color = 'red';
            tg.MainButton.hide();
        });

    // --- 4. ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ ---
    function initializeApp() {
        loadingDiv.style.display = 'none';
        builderDiv.style.display = 'block';

        const teamContainers = [
            { buttons: document.getElementById('team-1-tab-buttons'), contents: document.getElementById('team-1-tab-contents') },
            { buttons: document.getElementById('team-2-tab-buttons'), contents: document.getElementById('team-2-tab-contents') }
        ];

        // Создаем табы и слоты для каждой из двух команд
        teamContainers.forEach((container, teamIndex) => {
            for (let i = 0; i < 6; i++) {
                const button = document.createElement('button');
                button.className = 'tab-button';
                button.textContent = `Покемон ${i + 1}`;
                button.dataset.slotId = i;

                const slot = createPokemonSlot(teamIndex + 1, i);
                
                // Первый таб и слот делаем активными по умолчанию
                if (i === 0) {
                    button.classList.add('active');
                    slot.classList.add('active');
                }

                // Логика переключения табов по клику
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
    }
    
    // --- 5. ФУНКЦИЯ СОЗДАНИЯ ОДНОГО СЛОТА ПОКЕМОНА ---
    function createPokemonSlot(teamId, slotId) {
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
            // После каждого изменения проверяем, можно ли отправлять форму
            checkFormValidity();
        });

        return slot;
    }
    
    // --- 6. ФУНКЦИЯ ПРОВЕРКИ ВАЛИДНОСТИ ФОРМЫ ---
    function checkFormValidity() {
        const teams = { team1: [], team2: [] };
        document.querySelectorAll('.pokemon-slot').forEach(slot => {
            const species = slot.querySelector('.species-select').value;
            if (species) {
                const teamData = (slot.dataset.teamId === "1") ? teams.team1 : teams.team2;
                teamData.push(species);
            }
        });

        // Если в каждой команде есть хотя бы по одному покемону, показываем Главную Кнопку
        if (teams.team1.length > 0 && teams.team2.length > 0) {
            tg.MainButton.show();
        } else {
            tg.MainButton.hide();
        }
    }

    // --- 7. ФУНКЦИЯ СБОРА И ОТПРАВКИ ДАННЫХ ---
    function submitTeams() {
        tg.MainButton.showProgress(); // Показываем крутилку на кнопке
        tg.MainButton.disable();      // Делаем неактивной

        const teams = { team1: [], team2: [] };
        
        try {
            document.querySelectorAll('.pokemon-slot').forEach(slot => {
                const species = slot.querySelector('.species-select').value;
                if (species) {
                    const selectedMoves = Array.from(slot.querySelector('.moves-select').selectedOptions).map(opt => opt.value);

                    if (selectedMoves.length > 4) {
                        const pokemonName = GAME_DATA.species[species].name;
                        alert(`Ошибка: У покемона ${pokemonName} выбрано больше 4 атак!`);
                        slot.style.border = '2px solid red';
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
                    
                    const teamData = (slot.dataset.teamId === "1") ? teams.team1 : teams.team2;
                    teamData.push(pokemonData);
                }
            });

            // Отправляем данные и закрываем окно
            tg.sendData(JSON.stringify(teams));
            //tg.close();

        } catch (e) {
            // Если была ошибка (например, >4 атак), снова включаем кнопку
            console.error(e.message);
            tg.MainButton.hideProgress();
            tg.MainButton.enable();
        }
    }
});


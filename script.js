// Ждем, пока вся HTML-структура страницы загрузится
document.addEventListener('DOMContentLoaded', () => {
    const pokedexGrid = document.getElementById('pokedex-grid');
    const pokemonCount = 151; // Загрузим первых 151 покемона (первое поколение)

    // Асинхронная функция для получения данных о покемонах
    const fetchPokemons = async () => {
        for (let i = 1; i <= pokemonCount; i++) {
            await getPokemon(i);
        }
    };

    // Функция для получения данных одного покемона по его ID
    const getPokemon = async (id) => {
        const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
        try {
            const response = await fetch(url);
            const pokemon = await response.json();
            createPokemonCard(pokemon);
        } catch (error) {
            console.error("Не удалось загрузить покемона:", error);
        }
    };

    // Функция для создания HTML-карточки покемона и добавления ее на страницу
    const createPokemonCard = (pokemon) => {
        const card = document.createElement('div');
        card.classList.add('pokemon-card');

        const sprite = pokemon.sprites.front_default;
        const name = pokemon.name;

        // Создаем внутреннюю структуру карточки
        const cardHTML = `
            <img src="${sprite}" alt="${name}">
            <p class="pokemon-name">${name}</p>
        `;

        card.innerHTML = cardHTML;
        pokedexGrid.appendChild(card);
    };

    // Запускаем процесс загрузки
    fetchPokemons();
});
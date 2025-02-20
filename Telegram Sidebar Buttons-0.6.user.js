// ==UserScript==
// @name         Telegram Sidebar Buttons
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Добавляет боковое окно с цветными кнопками для поиска и копирования
// @author       [Ваше имя]
// @match        https://web.telegram.org/*
// @icon         https://icons.duckduckgo.com/ip2/web.telegram.org.ico
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    // Функция для создания кнопки
    function createButton(name, color) {
        const button = document.createElement('button');
        button.textContent = name;
        button.className = 'sidebar-button';
        button.style.backgroundColor = color;
        return button;
    }

    // Функция для получения конфигурации кнопок
    async function fetchConfig() {
        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbwsrrQRgSqMZKFBufvhhvJ68gRbqt19W-eYY2vBTgv-8Q2fWMdtnTH2CtxGEDdOQgx8rg/exec');
            const data = await response.json();

            // Преобразуем данные в нужный формат
            const config = {};
            for (const [categoryName, categoryConfig] of Object.entries(data)) {
                config[categoryName] = {};
                for (const [btnName, btnSettings] of Object.entries(categoryConfig)) {
                    config[categoryName][btnName] = {
                        name: btnSettings.name,
                        color: btnSettings.color,
                        link: btnSettings.link
                    };
                }
            }

            console.log('Получена конфигурация:', config);
            return config;
        } catch (error) {
            console.error('Ошибка при получении конфигурации:', error);
            return {
                "Документы": {
                    "btn1": { color: "#ffffff", link: "#documents" },
                    "btn2": { color: "#ffffff", link: "#docs" }
                },
                "Фото": {
                    "btn1": { color: "#ffffff", link: "#photos" },
                    "btn2": { color: "#ffffff", link: "#pics" }
                }
            };
        }
    }

    async function setSearchText(text) {
        const getElement = () => {
            return document.querySelector('.input-field-input') ||
                document.querySelector('#telegram-search-input');
        };

        let attempts = 0;
        const maxAttempts = 50; // Максимальное количество попыток (5 секунд)

        while (!getElement() && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        const searchInput = getElement();
        if (searchInput) {
            searchInput.focus();
            searchInput.value = '';
            const event = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
            });
            searchInput.value = text;
            searchInput.dispatchEvent(event);
            searchInput.focus();
        }
    }

    // Функция для копирования текста в буфер обмена
    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log(`Текст "${text}" успешно скопирован`);
        } catch (err) {
            console.error('Ошибка при копировании:', err);
        }
    }

    // Получаем конфигурацию кнопок
    const config = await fetchConfig();

    // Создаем контейнер для кнопок
    const container = document.createElement('div');
    container.id = 'telegram-sidebar-buttons';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-height: 70vh;
        overflow-y: hidden;
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        z-index: 10000;
        width: 200px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        transition: width 0.3s ease-in-out;
    `;

    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.contentRect.height >= 450) {
                container.style.overflowY = 'auto';
            } else {
                container.style.overflowY = 'hidden';
            }
        }
    });

    resizeObserver.observe(container);

    // Кнопка обновления
    const refreshButton = document.createElement('button');
    refreshButton.innerHTML = '↻';
    refreshButton.style.cssText = `
    position: relative;
    bottom: -10px;
    margin-bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 30px;
    border-radius: 4px;
    background-color: white;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
`;
    container.appendChild(refreshButton);

    // Функция для обновления конфигурации
    async function updateConfig() {
        try {
            // Добавляем спиннер и скрываем кнопку
            refreshButton.innerHTML = '';
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            refreshButton.appendChild(spinner);
            refreshButton.classList.add('loading');

            const newConfig = await fetchConfig();
            container.innerHTML = '';
            container.appendChild(refreshButton);
            container.appendChild(toggleButton);

            Object.entries(newConfig).forEach(([categoryName, categoryConfig]) => {
                const categoryElement = createCategory(categoryName, categoryConfig);
                container.appendChild(categoryElement);
            });

            // Возвращаем кнопку обратно
            refreshButton.innerHTML = '↻';
            refreshButton.classList.remove('loading');

            console.log('Конфигурация успешно обновлена');
        } catch (error) {
            refreshButton.innerHTML = '↻';
            refreshButton.classList.remove('loading');
            console.error('Ошибка при обновлении конфигурации:', error);
        }
    }

    // Добавляем обработчик клика по кнопке обновления
    refreshButton.onclick = updateConfig;

    // Кнопка показа/скрытия
    const toggleButton = document.createElement('button');
    toggleButton.innerHTML = '▼';
    toggleButton.style.cssText = `
        position: relative;
        bottom: -10px;
        margin-bottom:10px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 30px;
        border-radius: 4px;
        background-color: white;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease-in-out;
    `;
    container.appendChild(toggleButton);

    // Функция для создания категории
    function createCategory(categoryName, categoryConfig) {
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-container';

        // Создаем заголовок категории со стрелкой
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = categoryName;
        categoryHeader.style.cursor = 'pointer';

        // Создаем контейнер для кнопок категории
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';
        buttonsContainer.style.display = 'none'; // Скрыт по умолчанию
        // Добавляем кнопки в категорию
        Object.entries(categoryConfig).forEach(([btnName, btnSettings]) => {
            const button = createButton(btnSettings.name, btnSettings.color);
            button.onclick = () => {
                Promise.all([
                    setSearchText(btnSettings.link),
                    copyText(btnSettings.link)
                ]).then(() => {
                    console.log(`Ссылка "${btnSettings.link}" успешно обработана`);
                });
            };
            buttonsContainer.appendChild(button);
        });


        // Обработчик клика по заголовку категории
        categoryHeader.addEventListener('click', () => {
            const isOpen = buttonsContainer.style.display !== 'none';
            buttonsContainer.style.display = isOpen ? 'none' : 'flex';

            // Анимация сворачивания/разворачивания
            buttonsContainer.style.opacity = isOpen ? '0' : '1';
            setTimeout(() => {
                buttonsContainer.style.height = isOpen ? '0' : 'auto';
            }, 50);
        });

        categoryContainer.appendChild(categoryHeader);
        categoryContainer.appendChild(buttonsContainer);
        return categoryContainer;
    }

    // Добавляем категории согласно конфигурации
    Object.entries(config).forEach(([categoryName, categoryConfig]) => {
        const categoryElement = createCategory(categoryName, categoryConfig);
        container.appendChild(categoryElement);
    });

    // Добавляем стили для кнопок и категорий
    const style = document.createElement('style');
    style.textContent = `
        .sidebar-button {
            padding: 8px 12px;
            border: none;
            color: #000000;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
        }

        .sidebar-button:hover {
            transform: scale(1.05);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .category-header {
            padding: 8px 12px;
            background-color: #e0e0e0;
            border-radius: 4px;
            margin-bottom: 5px;
            font-weight: bold;
        }

        .buttons-container {
            display: flex;
            flex-direction: column;
            gap: 5px;
            overflow: hidden;
            transition: opacity 0.3s ease-in-out, height 0.3s ease-in-out;
        }

        #telegram-sidebar-buttons.minimized {
            width: 60px !important;
        }

        #telegram-sidebar-buttons.minimized .category-header,
        #telegram-sidebar-buttons.minimized .buttons-container {
            display: none;
        }
        .spinner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            z-index: 1;
        }

        @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .loading {
            pointer-events: none;
            opacity: 0.5;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);

    // Функция для переключения состояния панели
    function togglePanel() {
        const isMinimized = container.classList.toggle('minimized');
        toggleButton.innerHTML = isMinimized ? '▶' : '▼';
        localStorage.setItem('sidebarState', isMinimized ? 'minimized' : 'expanded');

        // Сворачиваем все категории при минимизации
        if (isMinimized) {
            document.querySelectorAll('.buttons-container').forEach(container => {
                container.style.display = 'none';
            });
        }
    }

    // Добавляем обработчик клика по кнопке переключения
    toggleButton.onclick = togglePanel;

    // Загружаем сохраненное состояние
    const savedState = localStorage.getItem('sidebarState');
    if (savedState === 'minimized') {
        togglePanel();
    }
})();
/**
 * Модуль построения коллажа
 */
$(document).ready(function () {
    'use strict';

    const CollageBuilder = {
        // Алгоритмы расстановки
        algorithms: {
            // Простая сетка
            grid: function (photos, canvasWidth, canvasHeight, padding = 20) {
                const positions = [];
                const cols = Math.ceil(Math.sqrt(photos.length));
                const rows = Math.ceil(photos.length / cols);

                const cellWidth = (canvasWidth - padding * (cols + 1)) / cols;
                const cellHeight = (canvasHeight - padding * (rows + 1)) / rows;

                photos.forEach((photo, index) => {
                    const col = index % cols;
                    const row = Math.floor(index / cols);

                    const x = padding + col * (cellWidth + padding);
                    const y = padding + row * (cellHeight + padding);

                    // Масштабируем фотографию под ячейку, сохраняя пропорции
                    const photoSize = window.PhotoManager.getPhotoPixelSize(photo);
                    const scaleX = cellWidth / photoSize.width;
                    const scaleY = cellHeight / photoSize.height;
                    const scale = Math.min(scaleX, scaleY);

                    positions.push({
                        photo: photo,
                        x: x + (cellWidth - photoSize.width * scale) / 2,
                        y: y + (cellHeight - photoSize.height * scale) / 2,
                        width: photoSize.width * scale,
                        height: photoSize.height * scale
                    });
                });

                return positions;
            },

            // Мозаика (случайное размещение)
            mosaic: function (photos, canvasWidth, canvasHeight, padding = 20) {
                const positions = [];
                const placedRects = [];

                // Сортируем фотографии по размеру (большие сначала)
                const sortedPhotos = [...photos].sort((a, b) => {
                    const sizeA = window.PhotoManager.getPhotoPixelSize(a);
                    const sizeB = window.PhotoManager.getPhotoPixelSize(b);
                    return (sizeB.width * sizeB.height) - (sizeA.width * sizeA.height);
                });

                sortedPhotos.forEach(photo => {
                    const photoSize = window.PhotoManager.getPhotoPixelSize(photo);
                    let placed = false;
                    let attempts = 0;
                    const maxAttempts = 100;

                    while (!placed && attempts < maxAttempts) {
                        const x = padding + Math.random() * (canvasWidth - photoSize.width - padding * 2);
                        const y = padding + Math.random() * (canvasHeight - photoSize.height - padding * 2);

                        const rect = {
                            x: x - padding,
                            y: y - padding,
                            width: photoSize.width + padding * 2,
                            height: photoSize.height + padding * 2
                        };

                        // Проверяем пересечение с уже размещенными фотографиями
                        const intersects = placedRects.some(placedRect =>
                            CollageBuilder.utils.rectanglesIntersect(rect, placedRect)
                        );

                        if (!intersects) {
                            positions.push({
                                photo: photo,
                                x: x,
                                y: y,
                                width: photoSize.width,
                                height: photoSize.height
                            });

                            placedRects.push(rect);
                            placed = true;
                        }

                        attempts++;
                    }

                    // Если не удалось разместить, размещаем в случайном месте
                    if (!placed) {
                        const x = Math.min(padding, canvasWidth - photoSize.width - padding);
                        const y = Math.min(padding, canvasHeight - photoSize.height - padding);

                        positions.push({
                            photo: photo,
                            x: Math.max(x, padding),
                            y: Math.max(y, padding),
                            width: photoSize.width,
                            height: photoSize.height
                        });
                    }
                });

                return positions;
            },

            // Линейное размещение
            linear: function (photos, canvasWidth, canvasHeight, padding = 20) {
                const positions = [];
                let currentX = padding;
                let currentY = padding;
                let maxRowHeight = 0;

                photos.forEach(photo => {
                    const photoSize = window.PhotoManager.getPhotoPixelSize(photo);

                    // Если фотография не помещается в ряд, переходим на следующий
                    if (currentX + photoSize.width > canvasWidth - padding) {
                        currentX = padding;
                        currentY += maxRowHeight + padding;
                        maxRowHeight = 0;
                    }

                    // Если фотография не помещается по высоте, масштабируем
                    if (currentY + photoSize.height > canvasHeight - padding) {
                        const scale = (canvasHeight - currentY - padding) / photoSize.height;
                        if (scale > 0.1) { // Минимальный масштаб
                            positions.push({
                                photo: photo,
                                x: currentX,
                                y: currentY,
                                width: photoSize.width * scale,
                                height: photoSize.height * scale
                            });

                            currentX += photoSize.width * scale + padding;
                            maxRowHeight = Math.max(maxRowHeight, photoSize.height * scale);
                        }
                    } else {
                        positions.push({
                            photo: photo,
                            x: currentX,
                            y: currentY,
                            width: photoSize.width,
                            height: photoSize.height
                        });

                        currentX += photoSize.width + padding;
                        maxRowHeight = Math.max(maxRowHeight, photoSize.height);
                    }
                });

                return positions;
            },

            // Размещение по спирали
            spiral: function (photos, canvasWidth, canvasHeight, padding = 20) {
                const positions = [];
                const center = {
                    x: canvasWidth / 2,
                    y: canvasHeight / 2
                };

                let angle = 0;
                let radius = 50;
                const angleStep = Math.PI / 4; // 45 градусов
                const radiusStep = 30;

                photos.forEach((photo, index) => {
                    const photoSize = window.PhotoManager.getPhotoPixelSize(photo);

                    let x = center.x + Math.cos(angle) * radius - photoSize.width / 2;
                    let y = center.y + Math.sin(angle) * radius - photoSize.height / 2;

                    // Убеждаемся, что фотография помещается в границы
                    x = Math.max(padding, Math.min(x, canvasWidth - photoSize.width - padding));
                    y = Math.max(padding, Math.min(y, canvasHeight - photoSize.height - padding));

                    positions.push({
                        photo: photo,
                        x: x,
                        y: y,
                        width: photoSize.width,
                        height: photoSize.height
                    });

                    angle += angleStep;
                    if (angle >= Math.PI * 2) {
                        angle = 0;
                        radius += radiusStep;
                    }
                });

                return positions;
            }
        },

        // Утилиты
        utils: {
            // Проверка пересечения прямоугольников
            rectanglesIntersect: function (rect1, rect2) {
                return !(rect1.x + rect1.width < rect2.x ||
                    rect2.x + rect2.width < rect1.x ||
                    rect1.y + rect1.height < rect2.y ||
                    rect2.y + rect2.height < rect1.y);
            },

            // Расчет коэффициента заполнения
            calculateFillRatio: function (positions, canvasWidth, canvasHeight) {
                const totalPhotoArea = positions.reduce((sum, pos) => {
                    return sum + pos.width * pos.height;
                }, 0);

                const canvasArea = canvasWidth * canvasHeight;
                return totalPhotoArea / canvasArea;
            },

            // Проверка выхода за границы
            checkBounds: function (positions, canvasWidth, canvasHeight) {
                return positions.every(pos =>
                    pos.x >= 0 &&
                    pos.y >= 0 &&
                    pos.x + pos.width <= canvasWidth &&
                    pos.y + pos.height <= canvasHeight
                );
            },

            // Оптимизация позиций (устранение пересечений)
            optimizePositions: function (positions, canvasWidth, canvasHeight) {
                const optimized = [...positions];
                let changed = true;
                let iterations = 0;
                const maxIterations = 50;

                while (changed && iterations < maxIterations) {
                    changed = false;
                    iterations++;

                    for (let i = 0; i < optimized.length; i++) {
                        for (let j = i + 1; j < optimized.length; j++) {
                            const pos1 = optimized[i];
                            const pos2 = optimized[j];

                            if (this.rectanglesIntersect(pos1, pos2)) {
                                // Сдвигаем вторую фотографию
                                const overlapX = Math.min(pos1.x + pos1.width - pos2.x, pos2.x + pos2.width - pos1.x);
                                const overlapY = Math.min(pos1.y + pos1.height - pos2.y, pos2.y + pos2.height - pos1.y);

                                if (overlapX < overlapY) {
                                    // Сдвигаем по X
                                    if (pos1.x < pos2.x) {
                                        pos2.x = Math.min(pos1.x + pos1.width + 10, canvasWidth - pos2.width);
                                    } else {
                                        pos2.x = Math.max(pos1.x - pos2.width - 10, 0);
                                    }
                                } else {
                                    // Сдвигаем по Y
                                    if (pos1.y < pos2.y) {
                                        pos2.y = Math.min(pos1.y + pos1.height + 10, canvasHeight - pos2.height);
                                    } else {
                                        pos2.y = Math.max(pos1.y - pos2.height - 10, 0);
                                    }
                                }

                                changed = true;
                            }
                        }
                    }
                }

                return optimized;
            }
        },

        // Основной метод построения коллажа
        build: function (algorithmName = 'linear', options = {}) {
            const app = window.CollageApp;
            if (!app || app.state.photos.length === 0) {
                app.showNotification('Нет фотографий для создания коллажа', 'warning');
                return;
            }

            const canvasWidth = app.state.albumWidth * app.config.pixelsPerCm;
            const canvasHeight = app.state.albumHeight * app.config.pixelsPerCm;
            const padding = options.padding || 20;

            // Получаем алгоритм
            const algorithm = this.algorithms[algorithmName];
            if (!algorithm) {
                app.showNotification('Неизвестный алгоритм расстановки', 'error');
                return;
            }

            // Очищаем текущий коллаж
            app.clearCollage();

            // Применяем алгоритм
            const positions = algorithm(app.state.photos, canvasWidth, canvasHeight, padding);

            // Оптимизируем позиции если нужно
            if (options.optimize !== false) {
                const optimizedPositions = this.utils.optimizePositions(positions, canvasWidth, canvasHeight);
                this.applyPositions(optimizedPositions);
            } else {
                this.applyPositions(positions);
            }

            // Показываем статистику
            this.showStats(positions, canvasWidth, canvasHeight);

            app.showNotification(`Коллаж создан (${algorithmName})`, 'success');
        },

        // Применение позиций к фотографиям
        applyPositions: function (positions) {
            const app = window.CollageApp;

            positions.forEach(pos => {
                const collagePhoto = {
                    id: 'collage_' + Date.now() + '_' + Math.random(),
                    photoId: pos.photo.id,
                    x: pos.x,
                    y: pos.y,
                    width: pos.width,
                    height: pos.height,
                    rotation: pos.photo.rotation || 0
                };

                app.state.collagePhotos.push(collagePhoto);
                app.renderCollagePhoto(collagePhoto, pos.photo);
            });

            app.updatePhotoCount();
        },

        // Показ статистики коллажа
        showStats: function (positions, canvasWidth, canvasHeight) {
            const fillRatio = this.utils.calculateFillRatio(positions, canvasWidth, canvasHeight);
            const inBounds = this.utils.checkBounds(positions, canvasWidth, canvasHeight);

            console.log('Статистика коллажа:', {
                фотографий: positions.length,
                заполнение: Math.round(fillRatio * 100) + '%',
                вПределахГраниц: inBounds
            });
        },

        // Создание коллажа с настройками
        createWithSettings: function () {
            const $modal = $(`
                <div class="modal j-collage-settings-modal" id="collage-settings-modal">
                    <div class="modal__overlay j-modal-overlay"></div>
                    <div class="modal__content">
                        <div class="modal__header">
                            <h3 class="modal__title">Настройки коллажа</h3>
                            <button class="modal__close j-modal-close"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="modal__body">
                            <div class="collage-settings">
                                <div class="collage-settings__group">
                                    <label class="collage-settings__label">Алгоритм расстановки:</label>
                                    <select class="collage-settings__select j-algorithm">
                                        <option value="linear">Линейный</option>
                                        <option value="grid">Сетка</option>
                                        <option value="mosaic">Мозаика</option>
                                        <option value="spiral">Спираль</option>
                                    </select>
                                </div>
                                <div class="collage-settings__group">
                                    <label class="collage-settings__label">Отступы (px):</label>
                                    <input type="number" class="collage-settings__input j-padding" min="0" max="100" value="20">
                                </div>
                                <div class="collage-settings__group">
                                    <label class="collage-settings__checkbox">
                                        <input type="checkbox" class="j-optimize" checked>
                                        Оптимизировать расположение
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="modal__footer">
                            <button class="modal__button modal__button--primary j-create-collage">Создать коллаж</button>
                            <button class="modal__button modal__button--secondary j-modal-close">Отмена</button>
                        </div>
                    </div>
                </div>
            `);

            // Добавляем модальное окно в DOM если его нет
            if ($('#collage-settings-modal').length === 0) {
                $('body').append($modal);

                // Привязываем события
                $modal.find('.j-create-collage').on('click', () => {
                    const algorithm = $modal.find('.j-algorithm').val();
                    const padding = parseInt($modal.find('.j-padding').val());
                    const optimize = $modal.find('.j-optimize').is(':checked');

                    this.build(algorithm, {padding, optimize});
                    window.CollageApp.hideModal();
                });

                $modal.find('.j-modal-overlay, .j-modal-close').on('click', () => {
                    window.CollageApp.hideModal();
                });
            }

            window.CollageApp.showModal('collage-settings-modal');
        },

        // Анализ лучшего алгоритма для текущих фотографий
        suggestBestAlgorithm: function () {
            const app = window.CollageApp;
            if (!app || app.state.photos.length === 0) {
                return 'linear';
            }

            const photoCount = app.state.photos.length;
            const canvasRatio = app.state.albumWidth / app.state.albumHeight;

            // Логика выбора алгоритма
            if (photoCount <= 4) {
                return canvasRatio > 1.5 ? 'linear' : 'grid';
            } else if (photoCount <= 9) {
                return 'grid';
            } else if (photoCount <= 20) {
                return 'mosaic';
            } else {
                return 'spiral';
            }
        },

        // Инициализация модуля
        init: function () {
            // Переопределяем метод автоматической расстановки
            if (window.CollageApp) {
                window.CollageApp.generateAutoLayout = () => {
                    const bestAlgorithm = this.suggestBestAlgorithm();
                    this.build(bestAlgorithm);
                };
            }

            console.log('CollageBuilder инициализирован');
        }
    };

    // Инициализация модуля
    CollageBuilder.init();

    // Экспорт для глобального использования
    window.CollageBuilder = CollageBuilder;
});
/**
 * Основной файл приложения фотоальбома-коллажа
 */
$(document).ready(function () {
    'use strict';

    // Инициализация основных компонентов
    const app = {
        // Конфигурация
        config: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            defaultPhotoSizes: {
                '5x7': {width: 5, height: 7},
                '7.5x10': {width: 7.5, height: 10},
                '8x10': {width: 8, height: 10},
                '9x11': {width: 9, height: 11},
                '10x10': {width: 10, height: 10},
                '10x15': {width: 10, height: 15},
                '15x20': {width: 15, height: 20}
            },
            pixelsPerCm: 37.8, // Будет динамически рассчитываться
            defaultDiagonal: 24 // Диагональ экрана по умолчанию в дюймах
        },

        // Переинициализация draggable элементов в коллаже
        reinitializeDraggables: function () {
            // Применяем для всех collage-photo в обоих canvas
            const canvasLeft = this.elements.canvasLeft;
            const canvasRight = this.elements.canvasRight;

            $('.collage-photo', canvasLeft).each((index, elem) => {
                try {
                    // destroy old draggable/resizable to avoid stacking handlers
                    if ($(elem).data('ui-draggable')) {
                        $(elem).draggable('destroy');
                    }
                    if ($(elem).data('ui-resizable')) {
                        $(elem).resizable('destroy');
                    }
                } catch (e) {
                }

                // Получаем collageId
                const collageId = $(elem).data('collage-id');
                // Получаем collagePhoto объект
                const collagePhoto = this.state.collagePhotos.find(p => p.id === collageId);
                if (!collagePhoto) return;

                $(elem).draggable({
                    containment: 'parent',
                    start: (event, ui) => {
                        $(elem).addClass('is-dragging');
                    },
                    drag: (event, ui) => {
                        this.updateCollagePhotoPosition(collagePhoto.id, ui.position.left, ui.position.top);
                        this.saveToLocalStorage();
                    },
                    stop: (event, ui) => {
                        $(elem).removeClass('is-dragging');
                        this.checkPhotoPageTransfer($(elem), collagePhoto);
                    }
                }).resizable({
                    aspectRatio: false,
                    minWidth: 50,
                    minHeight: 50,
                    resize: (event, ui) => {
                        this.updateCollagePhotoSize(collagePhoto.id, ui.size.width, ui.size.height);
                        this.saveToLocalStorage();
                    }
                });
            });

            $('.collage-photo', canvasRight).each((index, elem) => {
                try {
                    if ($(elem).data('ui-draggable')) {
                        $(elem).draggable('destroy');
                    }
                    if ($(elem).data('ui-resizable')) {
                        $(elem).resizable('destroy');
                    }
                } catch (e) {
                }
                const collageId = $(elem).data('collage-id');
                const collagePhoto = this.state.collagePhotos.find(p => p.id === collageId);
                if (!collagePhoto) return;

                $(elem).draggable({
                    containment: 'parent',
                    start: (event, ui) => {
                        $(elem).addClass('is-dragging');
                    },
                    drag: (event, ui) => {
                        this.updateCollagePhotoPosition(collagePhoto.id, ui.position.left, ui.position.top);
                        this.saveToLocalStorage();
                    },
                    stop: (event, ui) => {
                        $(elem).removeClass('is-dragging');
                        this.checkPhotoPageTransfer($(elem), collagePhoto);
                    }
                }).resizable({
                    aspectRatio: false,
                    minWidth: 50,
                    minHeight: 50,
                    resize: (event, ui) => {
                        this.updateCollagePhotoSize(collagePhoto.id, ui.size.width, ui.size.height);
                        this.saveToLocalStorage();
                    }
                });
            });
        },

        // Состояние приложения
        state: {
            albumWidth: 30,
            albumHeight: 20,
            photos: [],
            collagePhotos: [], // Объединенный массив для всех фотографий коллажа
            selectedPhoto: null,
            nextPhotoId: 1,
            scale: 1.0, // Добавляем масштаб
            showGrid: true // Сетка включена по умолчанию
        },

        // Элементы DOM
        elements: {
            albumWidth: $('.j-album-width'),
            albumHeight: $('.j-album-height'),
            presets: $('.j-preset'),
            dropzone: $('.j-dropzone'),
            fileInput: $('.j-file-input'),
            photoGallery: $('.j-photo-gallery'),
            canvasLeft: $('.j-canvas-left'),
            canvasRight: $('.j-canvas-right'),
            currentSize: $('.j-current-size'),
            photoCount: $('.j-photo-count'),
            clearAll: $('.j-clear-all'),
            modal: $('.j-modal'),
            modalOverlay: $('.j-modal-overlay'),
            modalClose: $('.j-modal-close'),
            photoSize: $('.j-photo-size'),
            customWidth: $('.j-custom-width'),
            customHeight: $('.j-custom-height'),
            rotation: $('.j-rotation'),
            rotationValue: $('.j-rotation-value'),
            applySettings: $('.j-apply-settings'),
            deletePhoto: $('.j-delete-photo'),
            customSize: $('.j-custom-size'),
            scaleUp: $('.j-scale-up'),
            scaleDown: $('.j-scale-down'),
            scaleReset: $('.j-scale-reset'),
            scaleValue: $('.j-scale-value'),
            scaleFit: $('.j-scale-fit'),
            screenDiagonal: $('.j-screen-diagonal'),
            pixelsPerCmValue: $('.j-pixels-per-cm')
        },

        // Инициализация приложения
        init: function () {
            this.updatePixelsPerCm();
            this.bindEvents();
            this.loadFromLocalStorage();
            this.updateCanvasSize();

            // Устанавливаем значение диагонали в интерфейс
            this.elements.screenDiagonal.val(this.config.defaultDiagonal);

            // Включаем сетку по умолчанию
            this.elements.canvasLeft.addClass('show-grid');
            this.elements.canvasRight.addClass('show-grid');

            // Auto-update on window resize
            $(window).on('resize', () => {
                this.updatePixelsPerCm();
                // При изменении размера окна можно автоматически подгонять масштаб
                // this.autoFitScale();
            });

            console.log('Приложение инициализировано');
        },

        // Привязка событий
        bindEvents: function () {
            // Изменение размеров альбома
            this.elements.albumWidth.on('input', () => {
                this.state.albumWidth = parseFloat(this.elements.albumWidth.val());
                this.updateCanvasSize();
                this.saveToLocalStorage();
            });

            this.elements.albumHeight.on('input', () => {
                this.state.albumHeight = parseFloat(this.elements.albumHeight.val());
                this.updateCanvasSize();
                this.saveToLocalStorage();
            });

            // Пресеты размеров
            this.elements.presets.on('click', (e) => {
                const $preset = $(e.currentTarget);
                const width = parseFloat($preset.data('width'));
                const height = parseFloat($preset.data('height'));

                this.setAlbumSize(width, height);
                this.updatePresetButtons($preset);
                this.saveToLocalStorage();
            });

            // Drag & Drop для загрузки файлов
            this.elements.dropzone.on('dragover dragenter', (e) => {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).addClass('is-dragover');
            });

            this.elements.dropzone.on('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).removeClass('is-dragover');
            });

            this.elements.dropzone.on('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).removeClass('is-dragover');

                const files = e.originalEvent.dataTransfer.files;
                this.handleFiles(files);
            });

            // Клик для выбора файлов
            this.elements.dropzone.on('click', (e) => {
                // Игнорируем, если событие исходит от input
                if (e.target === this.elements.fileInput[0]) return;

                e.preventDefault();

                // Добавляем визуальную обратную связь
                $(e.currentTarget).addClass('animate-pulse');
                setTimeout(() => {
                    $(e.currentTarget).removeClass('animate-pulse');
                }, 300);

                // Защита от множественных вызовов диалога
                if (this._openingFileDialog) return;
                this._openingFileDialog = true;
                const releaseGuard = () => {
                    this._openingFileDialog = false;
                };
                this.elements.fileInput.one('change', releaseGuard);
                setTimeout(releaseGuard, 1500);

                // Программно кликаем по input
                this.elements.fileInput[0].click();
            });

            this.elements.fileInput.on('click', (e) => {
                e.stopPropagation();
            });

            this.elements.fileInput.on('change', (e) => {
                this.handleFiles(e.target.files);
            });

            // Кнопки управления
            this.elements.clearAll.on('click', (e) => {
                if (confirm('Вы уверены, что хотите очистить коллаж?')) {
                    this.clearCollage();
                }
            });

            // Модальные окна
            this.elements.modalOverlay.on('click', () => {
                this.hideModal();
            });

            this.elements.modalClose.on('click', () => {
                this.hideModal();
            });

            // Модальное окно настроек фотографии
            this.elements.photoSize.on('change', (e) => {
                if ($(e.target).val() === 'custom') {
                    this.elements.customSize.show();
                } else {
                    this.elements.customSize.hide();
                }
            });

            this.elements.rotation.on('input', (e) => {
                this.elements.rotationValue.text(`${$(e.target).val()}°`);
            });

            this.elements.applySettings.on('click', () => {
                this.applyPhotoSettings();
            });

            this.elements.deletePhoto.on('click', () => {
                if (this.state.selectedPhoto) {
                    this.deletePhoto(this.state.selectedPhoto);
                    this.hideModal();
                }
            });

            // Drag & drop на canvasLeft
            this.elements.canvasLeft.on('dragover', (e) => {
                e.preventDefault();
                $(e.currentTarget).addClass('is-dragover');
            });

            this.elements.canvasLeft.on('dragleave', (e) => {
                e.preventDefault();
                $(e.currentTarget).removeClass('is-dragover');
            });

            this.elements.canvasLeft.on('drop', (e) => {
                e.preventDefault();
                $(e.currentTarget).removeClass('is-dragover');

                const dt = e.originalEvent.dataTransfer;
                // Если перетащили внешние файлы — загружаем их
                if (dt && dt.files && dt.files.length) {
                    this.handleFiles(dt.files);
                    return;
                }
                // Иначе это перетаскивание из галереи
                const photoId = dt.getData('text/plain');
                if (photoId) {
                    // Получаем координаты относительно canvasLeft
                    const canvasRect = this.elements.canvasLeft[0].getBoundingClientRect();

                    const x = e.originalEvent.clientX - canvasRect.left;
                    const y = e.originalEvent.clientY - canvasRect.top;

                    // Используем координаты как есть - canvas теперь занимает всю область page-inner
                    this.addPhotoToCollage(photoId, x, y, 'left');
                }
            });

            // Drag & drop на canvasRight
            this.elements.canvasRight.on('dragover', (e) => {
                e.preventDefault();
                $(e.currentTarget).addClass('is-dragover');
            });

            this.elements.canvasRight.on('dragleave', (e) => {
                e.preventDefault();
                $(e.currentTarget).removeClass('is-dragover');
            });

            this.elements.canvasRight.on('drop', (e) => {
                e.preventDefault();
                $(e.currentTarget).removeClass('is-dragover');

                const dt = e.originalEvent.dataTransfer;
                // Если перетащили внешние файлы — загружаем их
                if (dt && dt.files && dt.files.length) {
                    this.handleFiles(dt.files);
                    return;
                }
                // Иначе это перетаскивание из галереи
                const photoId = dt.getData('text/plain');
                if (photoId) {
                    // Получаем координаты относительно canvasRight
                    const canvasRect = this.elements.canvasRight[0].getBoundingClientRect();

                    const x = e.originalEvent.clientX - canvasRect.left;
                    const y = e.originalEvent.clientY - canvasRect.top;

                    // Используем координаты как есть - canvas теперь занимает всю область page-inner
                    this.addPhotoToCollage(photoId, x, y, 'right');
                }
            });

            // Предотвращаем стандартное поведение окна (например, открытие файла вкладкой)
            $(document).on('dragover drop', function (evt) {
                evt.preventDefault();
            });

            // Обработчики для кнопок масштабирования
            this.elements.scaleUp.on('click', () => {
                this.setScale(this.state.scale + 0.1);
            });

            this.elements.scaleDown.on('click', () => {
                this.setScale(this.state.scale - 0.1);
            });

            this.elements.scaleReset.on('click', () => {
                this.setScale(1.0);
            });

            this.elements.scaleFit.on('click', () => {
                this.autoFitScale();
            });

            // Обработчик для диагонали экрана - автоматическое обновление
            this.elements.screenDiagonal.on('input', () => {
                const diagonal = parseFloat(this.elements.screenDiagonal.val()) || this.config.defaultDiagonal;
                this.config.defaultDiagonal = diagonal;
                this.updatePixelsPerCm();
                this.updateCanvasSize();
                this.saveToLocalStorage();
            });

        },

        // Обработка загружаемых файлов
        handleFiles: function (files) {
            Array.from(files).forEach(file => {
                if (this.validateFile(file)) {
                    this.loadPhoto(file);
                }
            });
        },

        // Валидация файла
        validateFile: function (file) {
            if (!this.config.allowedTypes.includes(file.type)) {
                this.showNotification('Неподдерживаемый тип файла: ' + file.name, 'error');
                return false;
            }

            if (file.size > this.config.maxFileSize) {
                this.showNotification('Файл слишком большой: ' + file.name, 'error');
                return false;
            }

            return true;
        },

        // Загрузка фотографии
        loadPhoto: function (file) {
            const reader = new FileReader();
            const photoId = 'photo_' + this.state.nextPhotoId++;

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const photo = {
                        id: photoId,
                        file: file,
                        src: e.target.result,
                        name: file.name,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        size: '10x15',
                        rotation: 0
                    };

                    this.state.photos.push(photo);
                    this.renderPhoto(photo);
                    this.saveToLocalStorage();
                };
                img.src = e.target.result;
            };

            reader.readAsDataURL(file);
        },

        // Отображение фотографии в галерее
        renderPhoto: function (photo) {
            const $photoItem = $(`
                <div class="photo-item animate-slide-up" data-photo-id="${photo.id}" draggable="true">
                    <img src="${photo.src}" alt="${photo.name}" class="photo-item__image">
                    <div class="photo-item__controls">
                        <button class="photo-item__control photo-item__control--settings j-photo-settings" title="Настройки"><i class="fas fa-cog"></i></button>
                        <button class="photo-item__control photo-item__control--delete j-photo-delete" title="Удалить"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="photo-item__info">${photo.name}</div>
                </div>
            `);

            // Обработчики для элементов управления фотографией
            $photoItem.find('.j-photo-settings').on('click', (e) => {
                e.stopPropagation();
                this.showPhotoSettings(photo.id);
            });

            $photoItem.find('.j-photo-delete').on('click', (e) => {
                e.stopPropagation();
                this.deletePhoto(photo.id);
            });

            // Drag для перетаскивания в коллаж
            $photoItem.on('dragstart', (e) => {
                e.originalEvent.dataTransfer.setData('text/plain', photo.id);
                $photoItem.addClass('is-dragging');
            });

            $photoItem.on('dragend', () => {
                $photoItem.removeClass('is-dragging');
            });

            this.elements.photoGallery.append($photoItem);
        },

        // Удаление фотографии
        deletePhoto: function (photoId) {
            // Удаляем из массива фотографий
            this.state.photos = this.state.photos.filter(photo => photo.id !== photoId);

            // Удаляем из коллажа если есть - используем универсальный метод
            this.removePhotoFromCollage(photoId);

            // Удаляем из DOM
            $(`.photo-item[data-photo-id="${photoId}"]`).fadeOut(300, function () {
                $(this).remove();
            });
            this.saveToLocalStorage();
        },

        // Добавление фотографии в коллаж - универсальный метод
        addPhotoToCollage: function (photoId, x = 50, y = 50, page = 'left') {
            const photo = this.state.photos.find(p => p.id === photoId);
            if (!photo) return;

            // Проверяем, не добавлена ли уже эта фотография
            this.state.collagePhotos = this.state.collagePhotos || [];
            if (this.state.collagePhotos.find(p => p.photoId === photoId)) {
                this.showNotification('Фотография уже добавлена в коллаж', 'warning');
                return;
            }

            const size = this.config.defaultPhotoSizes[photo.size];
            // Убираем масштаб из расчета размеров - теперь масштабирование применяется ко всему альбому
            const pixelWidth = size.width * this.config.pixelsPerCm;
            const pixelHeight = size.height * this.config.pixelsPerCm;

            const collagePhoto = {
                id: 'collage_' + Date.now(),
                photoId: photoId,
                x: x,
                y: y,
                width: pixelWidth,
                height: pixelHeight,
                rotation: photo.rotation,
                page: page // Отмечаем, на какой странице фото
            };

            this.state.collagePhotos.push(collagePhoto);
            this.renderCollagePhoto(collagePhoto, photo);
            this.updatePhotoCount();
            this.saveToLocalStorage();
        },

        // Отображение фотографии в коллаже - универсальный метод
        renderCollagePhoto: function (collagePhoto, photo) {
            const $collagePhoto = $(`
                <div class="collage-photo animate-fade-in just-dropped" 
                     data-collage-id="${collagePhoto.id}"
                     data-page="${collagePhoto.page}"
                     style="left: ${collagePhoto.x}px; top: ${collagePhoto.y}px; 
                            width: ${collagePhoto.width}px; height: ${collagePhoto.height}px;
                            transform: rotate(${collagePhoto.rotation}deg);">
                    <img src="${photo.src}" alt="${photo.name}" class="collage-photo__image">
                    <div class="collage-photo__controls">
                        <button class="collage-photo__control collage-photo__control--rotate j-rotate" title="Повернуть"><i class="fas fa-redo"></i></button>
                        <button class="collage-photo__control collage-photo__control--settings j-settings" title="Настройки"><i class="fas fa-cog"></i></button>
                        <button class="collage-photo__control collage-photo__control--delete j-delete" title="Убрать из коллажа"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `);

            // Убираем класс анимации после завершения
            setTimeout(() => {
                $collagePhoto.removeClass('just-dropped');
            }, 500);

            // Обработчики событий
            $collagePhoto.find('.j-rotate').on('click', (e) => {
                e.stopPropagation();
                this.rotateCollagePhoto(collagePhoto.id);
            });

            $collagePhoto.find('.j-settings').on('click', (e) => {
                e.stopPropagation();
                this.showPhotoSettings(photo.id);
            });

            $collagePhoto.find('.j-delete').on('click', (e) => {
                e.stopPropagation();
                // Убираем конкретный экземпляр из коллажа по collageId, а не по photoId
                this.removeCollagePhotoById(collagePhoto.id);
            });

            // Делаем элемент перетаскиваемым и изменяемым по размеру
            $collagePhoto.draggable({
                // Для начала ограничиваем перетаскивание родительским канвасом
                containment: 'parent',
                start: (event, ui) => {
                    $collagePhoto.addClass('is-dragging');
                },
                drag: (event, ui) => {
                    this.updateCollagePhotoPosition(collagePhoto.id, ui.position.left, ui.position.top);
                    this.saveToLocalStorage();
                },
                stop: (event, ui) => {
                    $collagePhoto.removeClass('is-dragging');

                    // После окончания перетаскивания проверяем, не нужно ли перенести фото на другую страницу
                    this.checkPhotoPageTransfer($collagePhoto, collagePhoto);
                }
            }).resizable({
                aspectRatio: false,
                minWidth: 50,
                minHeight: 50,
                resize: (event, ui) => {
                    this.updateCollagePhotoSize(collagePhoto.id, ui.size.width, ui.size.height);
                    this.saveToLocalStorage();
                }
            });

            // Добавляем к соответствующему канвасу
            const targetCanvas = collagePhoto.page === 'left' ? this.elements.canvasLeft : this.elements.canvasRight;
            targetCanvas.append($collagePhoto);
        },

        // Поворот фотографии в коллаже - универсальный метод
        rotateCollagePhoto: function (collageId) {
            const collagePhoto = this.state.collagePhotos.find(p => p.id === collageId);
            if (!collagePhoto) return;

            collagePhoto.rotation = (collagePhoto.rotation + 90) % 360;

            // Находим DOM элемент
            const $element = $(`.collage-photo[data-collage-id="${collageId}"]`,
                collagePhoto.page === 'left' ? this.elements.canvasLeft : this.elements.canvasRight
            );
            $element.css('transform', `rotate(${collagePhoto.rotation}deg)`);
            this.saveToLocalStorage();
        },

        // Обновление позиции фотографии в коллаже - универсальный метод
        updateCollagePhotoPosition: function (collageId, x, y) {
            const collagePhoto = this.state.collagePhotos.find(p => p.id === collageId);
            if (collagePhoto) {
                collagePhoto.x = x;
                collagePhoto.y = y;
            }
        },

        // Обновление размера фотографии в коллаже - универсальный метод
        updateCollagePhotoSize: function (collageId, width, height) {
            const collagePhoto = this.state.collagePhotos.find(p => p.id === collageId);
            if (collagePhoto) {
                collagePhoto.width = width;
                collagePhoto.height = height;

                // Также обновляем размер в основном объекте photo для консистентности
                const photo = this.state.photos.find(p => p.id === collagePhoto.photoId);
                if (photo) {
                    // Вычисляем размер в сантиметрах
                    const widthCm = width / this.config.pixelsPerCm;
                    const heightCm = height / this.config.pixelsPerCm;

                    // Устанавливаем custom размер
                    photo.size = 'custom';
                    photo.customWidth = widthCm;
                    photo.customHeight = heightCm;
                    this.config.defaultPhotoSizes['custom'] = {
                        width: widthCm,
                        height: heightCm
                    };
                }
            }
        },

        // Удаление фотографии из коллажа - универсальный метод
        removePhotoFromCollage: function (photoId) {
            this.state.collagePhotos = this.state.collagePhotos.filter(p => p.photoId !== photoId);

            $(`.collage-photo`, this.elements.canvasLeft).each((index, element) => {
                const $element = $(element);
                const collagePhoto = this.state.collagePhotos.find(p => p.id === $element.data('collage-id'));
                if (!collagePhoto || collagePhoto.photoId === photoId) {
                    $element.fadeOut(300, function () {
                        $(this).remove();
                    });
                }
            });

            $(`.collage-photo`, this.elements.canvasRight).each((index, element) => {
                const $element = $(element);
                const collagePhoto = this.state.collagePhotos.find(p => p.id === $element.data('collage-id'));
                if (!collagePhoto || collagePhoto.photoId === photoId) {
                    $element.fadeOut(300, function () {
                        $(this).remove();
                    });
                }
            });

            this.updatePhotoCount();
            this.saveToLocalStorage();
        },

        // Удаление конкретного экземпляра из коллажа по collageId
        removeCollagePhotoById: function (collageId) {
            this.state.collagePhotos = this.state.collagePhotos.filter(p => p.id !== collageId);

            // Ищем и удаляем элемент из обеих canvas
            $(`.collage-photo[data-collage-id="${collageId}"]`, this.elements.canvasLeft).fadeOut(300, function () {
                $(this).remove();
            });
            $(`.collage-photo[data-collage-id="${collageId}"]`, this.elements.canvasRight).fadeOut(300, function () {
                $(this).remove();
            });

            this.updatePhotoCount();
            this.saveToLocalStorage();
        },

        // Очистка коллажа
        clearCollage: function () {
            this.state.collagePhotos = [];
            this.elements.canvasLeft.find('.collage-photo').fadeOut(300, function () {
                $(this).remove();
            });
            this.elements.canvasRight.find('.collage-photo').fadeOut(300, function () {
                $(this).remove();
            });
            this.updatePhotoCount();
            this.saveToLocalStorage();
        },

        // Установка размеров альбома
        setAlbumSize: function (width, height) {
            this.state.albumWidth = width;
            this.state.albumHeight = height;
            this.elements.albumWidth.val(width);
            this.elements.albumHeight.val(height);
            this.updateCanvasSize();
        },

        // Обновление размера канваса
        updateCanvasSize: function () {
            // Вычисляем фактические размеры в пикселях (строго по сантиметрам)
            const pageWidth = this.state.albumWidth * this.config.pixelsPerCm;
            const pageHeight = this.state.albumHeight * this.config.pixelsPerCm;

            // Отладочная информация
            console.log(`Размеры альбома: ${this.state.albumWidth} x ${this.state.albumHeight} см`);
            console.log(`Пикселей на см: ${this.config.pixelsPerCm.toFixed(2)}`);
            console.log(`Размер одной страницы: ${pageWidth.toFixed(0)} x ${pageHeight.toFixed(0)} пикселей`);
            console.log(`Размер разворота: ${(pageWidth * 2).toFixed(0)} x ${pageHeight.toFixed(0)} пикселей`);
            console.log(`Масштаб: ${(this.state.scale * 100).toFixed(0)}%`);

            // Устанавливаем фактические размеры альбома в пикселях
            const $book = $('.album-spread__book');
            $book.css({
                width: pageWidth * 2 + 'px', // две страницы
                height: pageHeight + 'px'
            });

            // Обновляем CSS переменную соотношения сторон для правильного отображения страниц
            const aspectRatio = this.state.albumWidth / this.state.albumHeight;
            document.documentElement.style.setProperty('--page-aspect-ratio', aspectRatio);

            // Применяем визуальное масштабирование ко всему альбому
            $book.css('transform', `scale(${this.state.scale})`);
            $book.css('transform-origin', 'center center');

            // Переинициализируем draggable элементы после изменения размеров
            this.reinitializeDraggables();

            // Обновляем информацию о размере
            this.elements.currentSize.text(`${this.state.albumWidth}x${this.state.albumHeight} см`);
            this.elements.scaleValue.text(`${(this.state.scale * 100).toFixed(0)}%`);

            // Проверяем, нужен ли скролл
            this.checkScrollNeeded();
        },

        // Проверка необходимости скролла
        checkScrollNeeded: function () {
            const $albumSpread = $('.album-spread');
            const $book = $('.album-spread__book');
            const $background = $('.album-spread__background');

            if (!$albumSpread.length || !$book.length) return;

            // Получаем размеры контейнера и книги (с учетом масштаба)
            const containerWidth = $albumSpread.width();
            const containerHeight = $albumSpread.height();

            const bookWidth = $book.width() * this.state.scale;
            const bookHeight = $book.height() * this.state.scale;

            // Учитываем отступы в background (1rem = 16px с каждой стороны)
            const horizontalPadding = 32; // 1rem * 2 стороны = 32px
            const verticalPadding = 16; // 0.5rem * 2 стороны = 16px

            // Проверяем нужен ли скролл
            const needsHorizontalScroll = bookWidth > (containerWidth - horizontalPadding);
            const needsVerticalScroll = bookHeight > (containerHeight - verticalPadding);

            // Добавляем класс если нужен скролл
            if (needsHorizontalScroll || needsVerticalScroll) {
                $albumSpread.addClass('has-scroll');
            } else {
                $albumSpread.removeClass('has-scroll');
            }

            // Управляем позиционированием альбома
            if (needsHorizontalScroll) {
                // Если нужна горизонтальная прокрутка - выравниваем по левому краю
                $background.css('justify-content', 'flex-start');
                $book.css('margin', '0'); // Убираем auto margin
            } else {
                // Если альбом помещается - центрируем его
                $background.css('justify-content', 'center');
                $book.css('margin', '0 auto'); // Добавляем auto margin для центрирования
            }
        },

        // Обновление кнопок пресетов
        updatePresetButtons: function ($activePreset) {
            this.elements.presets.removeClass('is-active');
            $activePreset.addClass('is-active');
        },

        // Обновление счетчика фотографий
        updatePhotoCount: function () {
            this.elements.photoCount.text(this.state.collagePhotos ? this.state.collagePhotos.length : 0);
        },

        // Показ модального окна
        showModal: function (modalId) {
            const $modal = $('#' + modalId);
            $modal.addClass('is-visible');
        },

        // Скрытие модального окна
        hideModal: function () {
            this.elements.modal.removeClass('is-visible');
        },

        // Показ настроек фотографии
        showPhotoSettings: function (photoId) {
            const photo = this.state.photos.find(p => p.id === photoId);
            if (!photo) return;

            this.state.selectedPhoto = photoId;

            // Заполняем форму
            this.elements.photoSize.val(photo.size);
            if (photo.size === 'custom') {
                const size = this.config.defaultPhotoSizes[photo.size] || {width: 10, height: 15};
                this.elements.customWidth.val(size.width);
                this.elements.customHeight.val(size.height);
                this.elements.customSize.show();
            } else {
                this.elements.customSize.hide();
            }

            this.elements.rotation.val(photo.rotation);
            this.elements.rotationValue.text(`${photo.rotation}°`);

            this.showModal('photo-settings-modal');
        },

        applyPhotoSettings: function () {
            if (!this.state.selectedPhoto) return;

            const photo = this.state.photos.find(p => p.id === this.state.selectedPhoto);
            if (!photo) return;

            // Обновляем размер
            const newSize = this.elements.photoSize.val();
            photo.size = newSize;

            // Если выбран custom, сохраняем размеры в самой фотографии
            if (newSize === 'custom') {
                const width = parseFloat(this.elements.customWidth.val());
                const height = parseFloat(this.elements.customHeight.val());
                photo.customWidth = width;
                photo.customHeight = height;
                this.config.defaultPhotoSizes['custom'] = {width, height};
            } else {
                // Удаляем пользовательские размеры если выбран стандартный размер
                delete photo.customWidth;
                delete photo.customHeight;
            }

            // Обновляем поворот
            photo.rotation = parseInt(this.elements.rotation.val());

            // Обновляем фотографии в коллаже если они там есть
            if (this.state.collagePhotos) {
                this.state.collagePhotos.forEach(collagePhoto => {
                    if (collagePhoto.photoId === photo.id) {
                        let size;
                        if (photo.size === 'custom' && photo.customWidth && photo.customHeight) {
                            size = {width: photo.customWidth, height: photo.customHeight};
                        } else {
                            size = this.config.defaultPhotoSizes[photo.size];
                        }

                        collagePhoto.width = size.width * this.config.pixelsPerCm;
                        collagePhoto.height = size.height * this.config.pixelsPerCm;
                        collagePhoto.rotation = photo.rotation;

                        // Обновляем DOM-элемент
                        const $element = $(`.collage-photo[data-collage-id="${collagePhoto.id}"]`,
                            collagePhoto.page === 'left' ? this.elements.canvasLeft : this.elements.canvasRight
                        );
                        $element.css({
                            width: collagePhoto.width + 'px',
                            height: collagePhoto.height + 'px',
                            transform: `rotate(${collagePhoto.rotation}deg)`
                        });

                        // Переинициализируем draggable/resizable для этого элемента
                        try {
                            if ($element.data('ui-draggable')) {
                                $element.draggable('destroy');
                            }
                            if ($element.data('ui-resizable')) {
                                $element.resizable('destroy');
                            }
                        } catch (e) {
                            console.warn('Ошибка при уничтожении UI элементов:', e);
                        }

                        // Заново инициализируем draggable/resizable
                        $element.draggable({
                            containment: 'parent',
                            start: (event, ui) => {
                                $element.addClass('is-dragging');
                            },
                            drag: (event, ui) => {
                                this.updateCollagePhotoPosition(collagePhoto.id, ui.position.left, ui.position.top);
                                this.saveToLocalStorage();
                            },
                            stop: (event, ui) => {
                                $element.removeClass('is-dragging');
                                this.checkPhotoPageTransfer($element, collagePhoto);
                            }
                        }).resizable({
                            aspectRatio: false,
                            minWidth: 50,
                            minHeight: 50,
                            resize: (event, ui) => {
                                this.updateCollagePhotoSize(collagePhoto.id, ui.size.width, ui.size.height);
                                this.saveToLocalStorage();
                            }
                        });
                    }
                });
            }

            this.saveToLocalStorage();
            this.hideModal();
            this.showNotification('Настройки применены', 'success');
        },

        saveToLocalStorage: function () {
            const stateToSave = {
                albumWidth: this.state.albumWidth,
                albumHeight: this.state.albumHeight,
                photos: this.state.photos.map(photo => ({
                    id: photo.id,
                    name: photo.name,
                    originalWidth: photo.originalWidth,
                    originalHeight: photo.originalHeight,
                    size: photo.size,
                    rotation: photo.rotation,
                    customWidth: photo.customWidth,
                    customHeight: photo.customHeight,
                    src: photo.src,
                    file: photo.file
                        ? {
                            name: photo.file.name,
                            size: photo.file.size,
                            type: photo.file.type
                        }
                        : undefined
                })),
                collagePhotos: this.state.collagePhotos,
                nextPhotoId: this.state.nextPhotoId,
                scale: this.state.scale,
                screenDiagonal: this.config.defaultDiagonal,
                customPhotoSizes: this.config.defaultPhotoSizes // Сохраняем пользовательские размеры
            };
            localStorage.setItem('photoAlbumState', JSON.stringify(stateToSave));
        },

        loadFromLocalStorage: function () {
            const savedState = localStorage.getItem('photoAlbumState');
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    this.state.albumWidth = state.albumWidth || 30;
                    this.state.albumHeight = state.albumHeight || 20;
                    this.state.collagePhotos = state.collagePhotos || [];
                    this.state.nextPhotoId = state.nextPhotoId || 1;
                    this.state.scale = typeof state.scale === 'number' ? state.scale : 1.0;

                    // Загружаем диагональ экрана если она сохранена
                    if (typeof state.screenDiagonal === 'number') {
                        this.config.defaultDiagonal = state.screenDiagonal;
                        this.elements.screenDiagonal.val(state.screenDiagonal);
                    }

                    // Восстанавливаем пользовательские размеры фотографий
                    if (state.customPhotoSizes && typeof state.customPhotoSizes === 'object') {
                        this.config.defaultPhotoSizes = {...this.config.defaultPhotoSizes, ...state.customPhotoSizes};
                    }

                    // Восстанавливаем фотографии с полными данными
                    this.state.photos = [];
                    if (state.photos && Array.isArray(state.photos)) {
                        state.photos.forEach(savedPhoto => {
                            // Создаем базовый объект фотографии
                            const photo = {
                                id: savedPhoto.id,
                                name: savedPhoto.name,
                                originalWidth: savedPhoto.originalWidth,
                                originalHeight: savedPhoto.originalHeight,
                                size: savedPhoto.size || '10x15',
                                rotation: savedPhoto.rotation || 0,
                                src: savedPhoto.src
                            };

                            // Восстанавливаем пользовательские размеры если они есть
                            if (savedPhoto.customWidth && savedPhoto.customHeight) {
                                photo.customWidth = savedPhoto.customWidth;
                                photo.customHeight = savedPhoto.customHeight;
                            }

                            // Создаем объект File из сохраненных данных
                            if (savedPhoto.file) {
                                // Создаем пустой File объект с базовыми свойствами
                                photo.file = {
                                    name: savedPhoto.file.name,
                                    size: savedPhoto.file.size,
                                    type: savedPhoto.file.type
                                };
                            }

                            this.state.photos.push(photo);
                        });
                    }

                    // Восстанавливаем UI
                    this.elements.albumWidth.val(this.state.albumWidth);
                    this.elements.albumHeight.val(this.state.albumHeight);

                    // Восстанавливаем фотографии в галерее
                    this.state.photos.forEach(photo => {
                        this.renderPhoto(photo);
                    });

                    // Восстанавливаем фотографии в коллаже универсально
                    if (this.state.collagePhotos) {
                        this.state.collagePhotos.forEach(collagePhoto => {
                            const photo = this.state.photos.find(p => p.id === collagePhoto.photoId);
                            if (photo) {
                                this.renderCollagePhoto(collagePhoto, photo);
                            }
                        });
                    }

                    // Восстанавливаем состояние сетки - всегда включена
                    this.elements.canvasLeft.addClass('show-grid');
                    this.elements.canvasRight.addClass('show-grid');

                    this.updateCanvasSize();
                    this.updatePhotoCount();

                    // Переинициализируем draggables после загрузки состояния
                    setTimeout(() => {
                        this.reinitializeDraggables();
                    }, 100); // Небольшая задержка для завершения рендеринга
                } catch (e) {
                    console.error('Ошибка загрузки из localStorage:', e);
                }
            }
        },

        showNotification: function (message, type = 'info') {
            const $notification = $(`
                <div class="notification notification--${type} animate-slide-up">
                    ${message}
                </div>
            `);

            $('body').append($notification);

            setTimeout(() => {
                $notification.fadeOut(300, function () {
                    $(this).remove();
                });
            }, 3000);
        },

        // Заглушка autoScaleAlbum: функция оставлена для обратной совместимости, теперь не выполняет масштабирования
        autoScaleAlbum: function () {
            // Масштабирование теперь реализовано через aspect-ratio и CSS, логика здесь больше не нужна.
        },

        // Проверяем, нужно ли перенести фото между страницами (canvas)
        checkPhotoPageTransfer: function ($collagePhoto, collagePhoto) {
            // Получаем контейнер книги
            const $book = $('.album-spread__book');
            if (!$book.length) return;

            // Определяем ширину одной страницы
            const bookWidth = $book.width();
            const pageWidth = bookWidth / 2; // каждая страница 50% ширины книги

            // Получаем текущие координаты фото относительно его canvas
            const currentLeft = $collagePhoto.position().left;
            const photoWidth = $collagePhoto.width();

            // Определяем абсолютную позицию центра фото в системе координат книги
            let absoluteCenterX;
            const inLeftCanvas = $collagePhoto.parent().hasClass('j-canvas-left');

            if (inLeftCanvas) {
                // Если фото в левом canvas, его центр = currentLeft + половина ширины фото
                absoluteCenterX = currentLeft + photoWidth / 2;
            } else {
                // Если фото в правом canvas, добавляем ширину левой страницы
                absoluteCenterX = pageWidth + currentLeft + photoWidth / 2;
            }

            // Проверяем, не пересек ли центр фото границу между страницами
            let newPage = collagePhoto.page;
            let needTransfer = false;

            if (absoluteCenterX < pageWidth && collagePhoto.page === 'right') {
                newPage = 'left';
                needTransfer = true;
            } else if (absoluteCenterX >= pageWidth && collagePhoto.page === 'left') {
                newPage = 'right';
                needTransfer = true;
            }

            if (needTransfer) {
                // Вычисляем новые координаты в целевом canvas
                let newX;
                if (newPage === 'left') {
                    newX = absoluteCenterX - photoWidth / 2;
                } else {
                    newX = absoluteCenterX - pageWidth - photoWidth / 2;
                }

                // Обновляем состояние
                collagePhoto.page = newPage;
                collagePhoto.x = newX;

                // Перемещаем в новый canvas
                const newCanvas = newPage === 'left' ? this.elements.canvasLeft : this.elements.canvasRight;
                $collagePhoto.appendTo(newCanvas);
                $collagePhoto.attr('data-page', newPage);
                $collagePhoto.css({
                    left: newX + 'px'
                });

                this.saveToLocalStorage();

                console.log('Photo transferred to', newPage, 'page at', newX, 'px');
            }
        },

        // LocalStorage функционал

        // Функция для вычисления реального пикселей на сантиметр с учетом физического экрана
        updatePixelsPerCm: function () {
            let pixelsPerCm = 37.8; // fallback значение (96 DPI)

            try {
                // Расчет на основе пользовательской диагонали экрана
                const diagonalInInches = this.config.defaultDiagonal;
                const diagonal = diagonalInInches * 2.54; // переводим дюймы в см
                const {width, height} = screen;
                const sidesRatio = width / height;
                const physicalWidth = Math.sqrt(diagonal ** 2 / (1 + sidesRatio ** 2)) * sidesRatio;
                const physicalHeight = Math.sqrt(diagonal ** 2 / (1 + sidesRatio ** 2));
                const calculatedPixelsPerCm = height / physicalHeight;

                if (calculatedPixelsPerCm > 0 && !isNaN(calculatedPixelsPerCm)) {
                    pixelsPerCm = calculatedPixelsPerCm;
                    console.log(`Физический размер экрана: ${physicalWidth.toFixed(2)} x ${physicalHeight.toFixed(2)} см`);
                    console.log(`Разрешение экрана: ${width} x ${height} пикселей`);
                }

            } catch (e) {
                console.warn('Не удалось вычислить точный размер пикселя, используется значение по умолчанию');
            }

            this.config.pixelsPerCm = pixelsPerCm;

            // Обновляем CSS переменную для калибровочного квадрата
            document.documentElement.style.setProperty('--pixels-per-cm', pixelsPerCm + 'px');

            // Показываем пользователю актуальное значение (если есть соответствующий элемент)
            if (this.elements.pixelsPerCmValue && this.elements.pixelsPerCmValue.length) {
                this.elements.pixelsPerCmValue.text(pixelsPerCm.toFixed(2));
            }

            // Добавляем анимацию обновления калибровочного квадрата
            const $calibrationSquare = $('.calibration-square');
            if ($calibrationSquare.length) {
                $calibrationSquare.addClass('updating');
                setTimeout(() => {
                    $calibrationSquare.removeClass('updating');
                }, 600);
            }

            console.log(`Пикселей на сантиметр: ${pixelsPerCm.toFixed(2)}`);
        },

        // Функция для установки нового масштаба
        setScale: function (newScale) {
            // Ограничения масштаба: от 0.5x до 3x
            if (newScale < 0.5) newScale = 0.5;
            if (newScale > 3.0) newScale = 3.0;

            // Устанавливаем новый масштаб
            this.state.scale = newScale;

            // Применяем масштабирование ко всему альбому
            this.updateCanvasSize();

            // Переинициализируем draggables после изменения масштаба
            this.reinitializeDraggables();

            // Сохраняем в localStorage
            this.saveToLocalStorage();
        },

        // Функция автоматического подбора масштаба для оптимального отображения
        autoFitScale: function () {
            const $albumSpread = $('.album-spread');
            if (!$albumSpread.length) return;

            // Получаем размеры контейнера с учетом padding и отступов background
            const containerWidth = $albumSpread.width() - 120 - 32; // padding + отступы background (1rem * 2)
            const containerHeight = $albumSpread.height() - 120 - 16; // padding + вертикальные отступы background (0.5rem * 2)

            // Вычисляем размеры альбома в пикселях (без масштаба)
            const albumWidth = this.state.albumWidth * this.config.pixelsPerCm * 2; // две страницы
            const albumHeight = this.state.albumHeight * this.config.pixelsPerCm;

            // Вычисляем коэффициенты масштабирования для ширины и высоты
            const scaleX = containerWidth / albumWidth;
            const scaleY = containerHeight / albumHeight;

            // Выбираем меньший коэффициент, чтобы альбом полностью помещался
            // Ограничиваем минимальный масштаб 0.1 и максимальный 2.0 (увеличиваем лимит)
            const optimalScale = Math.max(0.1, Math.min(scaleX, scaleY, 2.0));

            // Применяем оптимальный масштаб
            this.setScale(optimalScale);

            // Показываем уведомление о подгонке
            this.showNotification(`Масштаб подогнан: ${(optimalScale * 100).toFixed(0)}%`, 'info');
        },

        // Функция для тестирования расчетов (для отладки)
        testCalibration: function (diagonalInches) {
            console.log('=== ТЕСТ КАЛИБРОВКИ ЭКРАНА ===');
            const diagonal = diagonalInches * 2.54; // в см
            const {width, height} = screen;
            const sidesRatio = width / height;
            const physicalWidth = Math.sqrt(diagonal ** 2 / (1 + sidesRatio ** 2)) * sidesRatio;
            const physicalHeight = Math.sqrt(diagonal ** 2 / (1 + sidesRatio ** 2));
            const pixelsPerCm = height / physicalHeight;

            console.log(`Диагональ: ${diagonalInches}" (${diagonal.toFixed(2)} см)`);
            console.log(`Разрешение экрана: ${width} x ${height}`);
            console.log(`Соотношение сторон: ${sidesRatio.toFixed(3)}`);
            console.log(`Физический размер: ${physicalWidth.toFixed(2)} x ${physicalHeight.toFixed(2)} см`);
            console.log(`Пикселей на см: ${pixelsPerCm.toFixed(2)}`);

            // Тест для А4
            const a4Width = 21; // см  
            const a4Height = 29.7; // см
            const a4PixelWidth = a4Width * pixelsPerCm;
            const a4PixelHeight = a4Height * pixelsPerCm;

            console.log(`--- А4 (${a4Width} x ${a4Height} см) ---`);
            console.log(`А4 в пикселях: ${a4PixelWidth.toFixed(0)} x ${a4PixelHeight.toFixed(0)}`);
            console.log(`А4 разворот: ${(a4PixelWidth * 2).toFixed(0)} x ${a4PixelHeight.toFixed(0)}`);
            console.log('===============================');

            return pixelsPerCm;
        }


    };

    // Инициализация приложения
    app.init();

    // Экспорт для использования в других модулях
    window.CollageApp = app;

    // Экспортируем тестовую функцию для отладки
    window.testCalibration = app.testCalibration.bind(app);

    // Тестовая функция для A4
    window.testA4 = function () {
        console.log('=== ТЕСТ A4 ФОРМАТА ===');
        app.setAlbumSize(21, 29.7);
        app.updatePresetButtons($('.j-preset[data-width="21"]'));
        console.log('A4 установлен: 21×29.7 см');
        console.log('Соотношение сторон:', (21 / 29.7).toFixed(3), '(должно быть меньше 1 - альбом вертикальный)');
        console.log('=======================');
    };

    // Тестовая функция для широкого формата (проверка горизонтальной прокрутки)
    window.testWideFormat = function () {
        console.log('=== ТЕСТ ШИРОКОГО ФОРМАТА ===');
        app.setAlbumSize(50, 20); // Очень широкий формат
        app.updatePresetButtons();
        console.log('Широкий формат установлен: 50×20 см');
        console.log('Должна появиться горизонтальная прокрутка');
        console.log('Проверьте, что можно доскролить до левого края');
        console.log('=============================');
    };

    // Тестовая функция для проверки draggables
    window.testDraggables = function () {
        console.log('=== ТЕСТ ПЕРЕТАСКИВАНИЯ ===');
        console.log('Фотографий в коллаже:', app.state.collagePhotos.length);
        console.log('Переинициализация draggables...');
        app.reinitializeDraggables();

        // Проверяем наличие jQuery UI классов
        const leftPhotos = $('.collage-photo', app.elements.canvasLeft).length;
        const rightPhotos = $('.collage-photo', app.elements.canvasRight).length;
        const draggablePhotos = $('.collage-photo.ui-draggable').length;
        const resizablePhotos = $('.collage-photo.ui-resizable').length;

        console.log(`Фото в левом канвасе: ${leftPhotos}`);
        console.log(`Фото в правом канвасе: ${rightPhotos}`);
        console.log(`Draggable фото: ${draggablePhotos}`);
        console.log(`Resizable фото: ${resizablePhotos}`);
        console.log('==============================');
    };

    // Глобальная функция для принудительной переинициализации draggables
    window.fixDraggables = function () {
        console.log('🔧 Принудительная переинициализация draggables...');
        app.reinitializeDraggables();
        console.log('✅ Готово! Попробуйте перетащить фотографии.');
    };

    // Функция для диагностики размеров фотографий
    window.debugPhotoSizes = function () {
        console.log('=== ДИАГНОСТИКА РАЗМЕРОВ ФОТОГРАФИЙ ===');
        console.log('Доступные размеры:', app.config.defaultPhotoSizes);
        console.log('Фотографии в галерее:');
        app.state.photos.forEach(photo => {
            console.log(`  ${photo.name}: размер ${photo.size}, поворот ${photo.rotation}°`);
        });
        console.log('Фотографии в коллаже:');
        app.state.collagePhotos.forEach(collagePhoto => {
            const photo = app.state.photos.find(p => p.id === collagePhoto.photoId);
            console.log(`  ${photo ? photo.name : 'Unknown'}: ${collagePhoto.width}x${collagePhoto.height}px, страница ${collagePhoto.page}`);
        });
        console.log('========================================');
    };

    // Универсальная функция для исправления всех проблем
    window.fixAll = function () {
        console.log('🔧 ПОЛНОЕ ИСПРАВЛЕНИЕ...');
        console.log('1. Переинициализация draggables...');
        app.reinitializeDraggables();

        console.log('2. Обновление размеров альбома...');
        app.updateCanvasSize();

        console.log('3. Сохранение состояния...');
        app.saveToLocalStorage();

        console.log('✅ Все исправлено! Попробуйте перетащить и изменить размер фотографий.');
    };
});
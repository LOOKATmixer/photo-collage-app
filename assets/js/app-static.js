/**
 * Статическая версия приложения фотоальбома-коллажа для GitHub Pages
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
                small: {width: 5, height: 7},
                medium: {width: 10, height: 15},
                large: {width: 15, height: 20}
            },
            pixelsPerCm: 37.8 // Для конвертации см в пиксели (96 DPI)
        },

        // Состояние приложения
        state: {
            albumWidth: 30,
            albumHeight: 20,
            photos: [],
            collagePhotos: [],
            selectedPhoto: null,
            nextPhotoId: 1
        },

        // Элементы DOM
        elements: {
            albumWidth: $('.j-album-width'),
            albumHeight: $('.j-album-height'),
            presets: $('.j-preset'),
            dropzone: $('.j-dropzone'),
            fileInput: $('.j-file-input'),
            photoGallery: $('.j-photo-gallery'),
            canvas: $('.j-canvas'),
            currentSize: $('.j-current-size'),
            photoCount: $('.j-photo-count'),
            generateLayout: $('.j-generate-layout'),
            clearAll: $('.j-clear-all'),
            saveProject: $('.j-save-project'),
            modal: $('.j-modal'),
            modalOverlay: $('.j-modal-overlay'),
            modalClose: $('.j-modal-close')
        },

        // Инициализация приложения
        init: function () {
            this.bindEvents();
            this.updateCanvasSize();
            this.showEmptyState();
            this.showStaticNotice();
            console.log('Статическая версия приложения инициализирована');
        },

        // Показ уведомления о статической версии
        showStaticNotice: function () {
            this.showNotification('Это демо-версия для GitHub Pages. Загрузка файлов работает только локально.', 'info');
        },

        // Привязка событий
        bindEvents: function () {
            // Изменение размеров альбома
            this.elements.albumWidth.on('input', () => {
                this.state.albumWidth = parseFloat(this.elements.albumWidth.val());
                this.updateCanvasSize();
            });

            this.elements.albumHeight.on('input', () => {
                this.state.albumHeight = parseFloat(this.elements.albumHeight.val());
                this.updateCanvasSize();
            });

            // Пресеты размеров
            this.elements.presets.on('click', (e) => {
                const $preset = $(e.currentTarget);
                const width = parseFloat($preset.data('width'));
                const height = parseFloat($preset.data('height'));

                this.setAlbumSize(width, height);
                this.updatePresetButtons($preset);
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
            this.elements.dropzone.on('click', () => {
                this.elements.fileInput.click();
            });

            this.elements.fileInput.on('change', (e) => {
                this.handleFiles(e.target.files);
            });

            // Кнопки управления
            this.elements.generateLayout.on('click', () => {
                this.generateAutoLayout();
            });

            this.elements.clearAll.on('click', () => {
                this.clearCollage();
            });

            this.elements.saveProject.on('click', () => {
                this.showNotification('Сохранение недоступно в статической версии', 'warning');
            });

            // Модальные окна
            this.elements.modalOverlay.on('click', () => {
                this.hideModal();
            });

            this.elements.modalClose.on('click', () => {
                this.hideModal();
            });

            // Делаем canvas областью для drop
            this.elements.canvas.on('dragover', (e) => {
                e.preventDefault();
            });

            this.elements.canvas.on('drop', (e) => {
                e.preventDefault();
                const photoId = e.originalEvent.dataTransfer.getData('text/plain');
                if (photoId) {
                    const rect = this.elements.canvas[0].getBoundingClientRect();
                    const x = e.originalEvent.clientX - rect.left;
                    const y = e.originalEvent.clientY - rect.top;
                    this.addPhotoToCollage(photoId, x, y);
                }
            });
        },

        // Обработка загружаемых файлов (только локально)
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

        // Загрузка фотографии (только локально)
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
                        size: 'medium',
                        rotation: 0
                    };

                    this.state.photos.push(photo);
                    this.renderPhoto(photo);
                    this.hideEmptyState();
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

        // Остальные методы остаются такими же как в оригинальном app.js
        deletePhoto: function (photoId) {
            this.state.photos = this.state.photos.filter(photo => photo.id !== photoId);
            this.removePhotoFromCollage(photoId);
            $(`.photo-item[data-photo-id="${photoId}"]`).fadeOut(300, function () {
                $(this).remove();
            });

            if (this.state.photos.length === 0) {
                this.showEmptyState();
            }
        },

        addPhotoToCollage: function (photoId, x = 50, y = 50) {
            const photo = this.state.photos.find(p => p.id === photoId);
            if (!photo) return;

            if (this.state.collagePhotos.find(p => p.photoId === photoId)) {
                this.showNotification('Фотография уже добавлена в коллаж', 'warning');
                return;
            }

            const size = this.config.defaultPhotoSizes[photo.size];
            const pixelWidth = size.width * this.config.pixelsPerCm;
            const pixelHeight = size.height * this.config.pixelsPerCm;

            const collagePhoto = {
                id: 'collage_' + Date.now(),
                photoId: photoId,
                x: x,
                y: y,
                width: pixelWidth,
                height: pixelHeight,
                rotation: photo.rotation
            };

            this.state.collagePhotos.push(collagePhoto);
            this.renderCollagePhoto(collagePhoto, photo);
            this.updatePhotoCount();
        },

        renderCollagePhoto: function (collagePhoto, photo) {
            const $collagePhoto = $(`
                <div class="collage-photo animate-fade-in" 
                     data-collage-id="${collagePhoto.id}"
                     style="left: ${collagePhoto.x}px; top: ${collagePhoto.y}px; 
                            width: ${collagePhoto.width}px; height: ${collagePhoto.height}px;
                            transform: rotate(${collagePhoto.rotation}deg);">
                    <img src="${photo.src}" alt="${photo.name}" class="collage-photo__image">
                    <div class="collage-photo__controls">
                        <button class="collage-photo__control collage-photo__control--rotate j-rotate" title="Повернуть"><i class="fas fa-redo"></i></button>
                        <button class="collage-photo__control collage-photo__control--settings j-settings" title="Настройки"><i class="fas fa-cog"></i></button>
                        <button class="collage-photo__control collage-photo__control--delete j-delete" title="Удалить"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `);

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
                this.removePhotoFromCollage(photo.id);
            });

            $collagePhoto.draggable({
                containment: 'parent',
                drag: (event, ui) => {
                    this.updateCollagePhotoPosition(collagePhoto.id, ui.position.left, ui.position.top);
                }
            }).resizable({
                aspectRatio: false,
                minWidth: 50,
                minHeight: 50,
                resize: (event, ui) => {
                    this.updateCollagePhotoSize(collagePhoto.id, ui.size.width, ui.size.height);
                }
            });

            this.elements.canvas.append($collagePhoto);
        },

        rotateCollagePhoto: function (collageId) {
            const collagePhoto = this.state.collagePhotos.find(p => p.id === collageId);
            if (!collagePhoto) return;

            collagePhoto.rotation = (collagePhoto.rotation + 90) % 360;

            const $element = $(`.collage-photo[data-collage-id="${collageId}"]`);
            $element.css('transform', `rotate(${collagePhoto.rotation}deg)`);
        },

        updateCollagePhotoPosition: function (collageId, x, y) {
            const collagePhoto = this.state.collagePhotos.find(p => p.id === collageId);
            if (collagePhoto) {
                collagePhoto.x = x;
                collagePhoto.y = y;
            }
        },

        updateCollagePhotoSize: function (collageId, width, height) {
            const collagePhoto = this.state.collagePhotos.find(p => p.id === collageId);
            if (collagePhoto) {
                collagePhoto.width = width;
                collagePhoto.height = height;
            }
        },

        removePhotoFromCollage: function (photoId) {
            this.state.collagePhotos = this.state.collagePhotos.filter(p => p.photoId !== photoId);
            $(`.collage-photo`).each((index, element) => {
                const $element = $(element);
                const collagePhoto = this.state.collagePhotos.find(p => p.id === $element.data('collage-id'));
                if (!collagePhoto) {
                    $element.fadeOut(300, function () {
                        $(this).remove();
                    });
                }
            });
            this.updatePhotoCount();
        },

        generateAutoLayout: function () {
            if (this.state.photos.length === 0) {
                this.showNotification('Нет фотографий для расстановки', 'warning');
                return;
            }

            this.clearCollage();

            const canvasWidth = this.state.albumWidth * this.config.pixelsPerCm;
            const canvasHeight = this.state.albumHeight * this.config.pixelsPerCm;
            const padding = 20;

            let currentX = padding;
            let currentY = padding;
            let maxRowHeight = 0;

            this.state.photos.forEach(photo => {
                const size = this.config.defaultPhotoSizes[photo.size];
                const photoWidth = size.width * this.config.pixelsPerCm;
                const photoHeight = size.height * this.config.pixelsPerCm;

                if (currentX + photoWidth > canvasWidth - padding) {
                    currentX = padding;
                    currentY += maxRowHeight + padding;
                    maxRowHeight = 0;
                }

                if (currentY + photoHeight > canvasHeight - padding) {
                    return;
                }

                this.addPhotoToCollage(photo.id, currentX, currentY);

                currentX += photoWidth + padding;
                maxRowHeight = Math.max(maxRowHeight, photoHeight);
            });

            this.showNotification('Автоматическая расстановка завершена', 'success');
        },

        clearCollage: function () {
            this.state.collagePhotos = [];
            this.elements.canvas.find('.collage-photo').fadeOut(300, function () {
                $(this).remove();
            });
            this.updatePhotoCount();
        },

        setAlbumSize: function (width, height) {
            this.state.albumWidth = width;
            this.state.albumHeight = height;
            this.elements.albumWidth.val(width);
            this.elements.albumHeight.val(height);
            this.updateCanvasSize();
        },

        updateCanvasSize: function () {
            const pixelWidth = this.state.albumWidth * this.config.pixelsPerCm;
            const pixelHeight = this.state.albumHeight * this.config.pixelsPerCm;

            this.elements.canvas.css({
                width: pixelWidth + 'px',
                height: pixelHeight + 'px'
            });

            this.elements.currentSize.text(`${this.state.albumWidth}x${this.state.albumHeight} см`);
        },

        updatePresetButtons: function ($activePreset) {
            this.elements.presets.removeClass('is-active');
            $activePreset.addClass('is-active');
        },

        updatePhotoCount: function () {
            this.elements.photoCount.text(this.state.collagePhotos.length);
        },

        showEmptyState: function () {
            if (this.state.photos.length === 0) {
                this.elements.photoGallery.html(`
                    <div class="empty-state">
                        <div class="empty-state__icon"><i class="fas fa-camera fa-4x"></i></div>
                        <div class="empty-state__text">Нет загруженных фотографий</div>
                        <div class="empty-state__subtext">Перетащите фотографии в область выше</div>
                    </div>
                `);
            }
        },

        hideEmptyState: function () {
            this.elements.photoGallery.find('.empty-state').remove();
        },

        showModal: function (modalId) {
            const $modal = $('#' + modalId);
            $modal.addClass('is-visible');
        },

        hideModal: function () {
            this.elements.modal.removeClass('is-visible');
        },

        showPhotoSettings: function (photoId) {
            console.log('Показать настройки для фото:', photoId);
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
        }
    };

    // Инициализация приложения
    app.init();

    // Экспорт для использования в других модулях
    window.CollageApp = app;
});
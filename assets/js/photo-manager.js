/**
 * Модуль управления фотографиями
 */
$(document).ready(function () {
    'use strict';

    const PhotoManager = {
        // Элементы модального окна настроек
        elements: {
            modal: $('#photo-settings-modal'),
            photoSize: $('.j-photo-size'),
            customSize: $('.j-custom-size'),
            customWidth: $('.j-custom-width'),
            customHeight: $('.j-custom-height'),
            rotation: $('.j-rotation'),
            rotationValue: $('.j-rotation-value'),
            applySettings: $('.j-apply-settings')
        },

        // Текущая редактируемая фотография
        currentPhoto: null,

        // Инициализация
        init: function () {
            this.bindEvents();
            console.log('PhotoManager инициализирован');
        },

        // Привязка событий
        bindEvents: function () {
            // Изменение размера фотографии
            this.elements.photoSize.on('change', () => {
                const size = this.elements.photoSize.val();
                if (size === 'custom') {
                    this.elements.customSize.show();
                    this.setCustomSizeFromCurrent();
                } else {
                    this.elements.customSize.hide();
                }
            });

            // Изменение поворота
            this.elements.rotation.on('input', () => {
                const rotation = this.elements.rotation.val();
                this.elements.rotationValue.text(rotation + '°');
            });

            // Применение настроек
            this.elements.applySettings.on('click', () => {
                this.applyPhotoSettings();
            });
        },

        // Показ настроек для фотографии
        showSettings: function (photoId) {
            const photo = window.CollageApp.state.photos.find(p => p.id === photoId);
            if (!photo) return;

            this.currentPhoto = photo;
            this.loadPhotoSettings(photo);
            window.CollageApp.showModal('photo-settings-modal');
        },

        // Загрузка текущих настроек фотографии
        loadPhotoSettings: function (photo) {
            // Устанавливаем размер
            this.elements.photoSize.val(photo.size);

            if (photo.size === 'custom') {
                this.elements.customSize.show();
                const size = this.getPhotoPixelSize(photo);
                this.elements.customWidth.val((size.width / window.CollageApp.config.pixelsPerCm).toFixed(1));
                this.elements.customHeight.val((size.height / window.CollageApp.config.pixelsPerCm).toFixed(1));
            } else {
                this.elements.customSize.hide();
            }

            // Устанавливаем поворот
            this.elements.rotation.val(photo.rotation);
            this.elements.rotationValue.text(photo.rotation + '°');
        },

        // Установка пользовательского размера на основе текущего
        setCustomSizeFromCurrent: function () {
            if (!this.currentPhoto) return;

            const currentSize = window.CollageApp.config.defaultPhotoSizes[this.currentPhoto.size] ||
                window.CollageApp.config.defaultPhotoSizes.medium;

            this.elements.customWidth.val(currentSize.width);
            this.elements.customHeight.val(currentSize.height);
        },

        // Получение размера фотографии в пикселях
        getPhotoPixelSize: function (photo) {
            if (photo.customWidth && photo.customHeight) {
                return {
                    width: photo.customWidth * window.CollageApp.config.pixelsPerCm,
                    height: photo.customHeight * window.CollageApp.config.pixelsPerCm
                };
            }

            const size = window.CollageApp.config.defaultPhotoSizes[photo.size] ||
                window.CollageApp.config.defaultPhotoSizes.medium;

            return {
                width: size.width * window.CollageApp.config.pixelsPerCm,
                height: size.height * window.CollageApp.config.pixelsPerCm
            };
        },

        // Применение настроек фотографии
        applyPhotoSettings: function () {
            if (!this.currentPhoto) return;

            const newSize = this.elements.photoSize.val();
            const newRotation = parseInt(this.elements.rotation.val());

            // Обновляем настройки фотографии
            this.currentPhoto.size = newSize;
            this.currentPhoto.rotation = newRotation;

            // Если выбран пользовательский размер
            if (newSize === 'custom') {
                this.currentPhoto.customWidth = parseFloat(this.elements.customWidth.val());
                this.currentPhoto.customHeight = parseFloat(this.elements.customHeight.val());
            } else {
                delete this.currentPhoto.customWidth;
                delete this.currentPhoto.customHeight;
            }

            // Обновляем фотографии в коллаже
            this.updateCollagePhotos();

            // Обновляем информацию в галерее
            this.updatePhotoGalleryInfo();

            // Закрываем модальное окно
            window.CollageApp.hideModal();

            // Показываем уведомление
            window.CollageApp.showNotification('Настройки фотографии применены', 'success');
        },

        // Обновление фотографий в коллаже
        updateCollagePhotos: function () {
            const photo = this.currentPhoto;

            // Находим все экземпляры этой фотографии в коллаже
            window.CollageApp.state.collagePhotos.forEach(collagePhoto => {
                if (collagePhoto.photoId === photo.id) {
                    const newSize = this.getPhotoPixelSize(photo);

                    // Обновляем размер и поворот
                    collagePhoto.width = newSize.width;
                    collagePhoto.height = newSize.height;
                    collagePhoto.rotation = photo.rotation;

                    // Обновляем DOM элемент
                    const $element = $(`.collage-photo[data-collage-id="${collagePhoto.id}"]`);
                    if ($element.length) {
                        $element.css({
                            width: newSize.width + 'px',
                            height: newSize.height + 'px',
                            transform: `rotate(${photo.rotation}deg)`
                        });

                        // Обновляем draggable и resizable
                        if ($element.hasClass('ui-draggable')) {
                            $element.draggable('destroy');
                        }
                        if ($element.hasClass('ui-resizable')) {
                            $element.resizable('destroy');
                        }

                        // Переинициализируем draggable и resizable
                        $element.draggable({
                            containment: 'parent',
                            drag: (event, ui) => {
                                window.CollageApp.updateCollagePhotoPosition(collagePhoto.id, ui.position.left, ui.position.top);
                            }
                        }).resizable({
                            aspectRatio: false,
                            minWidth: 50,
                            minHeight: 50,
                            resize: (event, ui) => {
                                window.CollageApp.updateCollagePhotoSize(collagePhoto.id, ui.size.width, ui.size.height);
                            }
                        });
                    }
                }
            });
        },

        // Обновление информации в галерее фотографий
        updatePhotoGalleryInfo: function () {
            const photo = this.currentPhoto;
            const $photoItem = $(`.photo-item[data-photo-id="${photo.id}"]`);

            if ($photoItem.length) {
                let sizeText = '';

                if (photo.size === 'custom') {
                    sizeText = `${photo.customWidth}x${photo.customHeight} см`;
                } else {
                    const size = window.CollageApp.config.defaultPhotoSizes[photo.size];
                    sizeText = `${size.width}x${size.height} см`;
                }

                // Обновляем информацию о фотографии
                const $info = $photoItem.find('.photo-item__info');
                $info.html(`${photo.name}<br><small>${sizeText}</small>`);

                // Добавляем индикатор поворота если есть
                if (photo.rotation !== 0) {
                    $info.append(`<br><small><i class="fas fa-redo"></i> ${photo.rotation}°</small>`);
                }
            }
        },

        // Создание копии фотографии с разными настройками
        duplicatePhoto: function (photoId) {
            const originalPhoto = window.CollageApp.state.photos.find(p => p.id === photoId);
            if (!originalPhoto) return;

            const duplicatedPhoto = {
                ...originalPhoto,
                id: 'photo_' + window.CollageApp.state.nextPhotoId++,
                name: originalPhoto.name + ' (копия)'
            };

            window.CollageApp.state.photos.push(duplicatedPhoto);
            window.CollageApp.renderPhoto(duplicatedPhoto);

            window.CollageApp.showNotification('Фотография скопирована', 'success');
        },

        // Сброс настроек фотографии к значениям по умолчанию
        resetPhotoSettings: function (photoId) {
            const photo = window.CollageApp.state.photos.find(p => p.id === photoId);
            if (!photo) return;

            photo.size = 'medium';
            photo.rotation = 0;
            delete photo.customWidth;
            delete photo.customHeight;

            // Обновляем коллаж и галерею
            this.currentPhoto = photo;
            this.updateCollagePhotos();
            this.updatePhotoGalleryInfo();

            window.CollageApp.showNotification('Настройки фотографии сброшены', 'info');
        },

        // Получение статистики по фотографии
        getPhotoStats: function (photoId) {
            const photo = window.CollageApp.state.photos.find(p => p.id === photoId);
            if (!photo) return null;

            const pixelSize = this.getPhotoPixelSize(photo);
            const cmSize = {
                width: pixelSize.width / window.CollageApp.config.pixelsPerCm,
                height: pixelSize.height / window.CollageApp.config.pixelsPerCm
            };

            // Подсчитываем сколько раз используется в коллаже
            const usageCount = window.CollageApp.state.collagePhotos.filter(cp => cp.photoId === photoId).length;

            return {
                originalSize: {
                    width: photo.originalWidth,
                    height: photo.originalHeight
                },
                printSize: cmSize,
                pixelSize: pixelSize,
                rotation: photo.rotation,
                usageCount: usageCount,
                fileSize: photo.file.size
            };
        },

        // Проверка помещается ли фотография в альбом
        checkPhotoFitsInAlbum: function (photoId) {
            const stats = this.getPhotoStats(photoId);
            if (!stats) return false;

            const albumWidth = window.CollageApp.state.albumWidth;
            const albumHeight = window.CollageApp.state.albumHeight;

            return stats.printSize.width <= albumWidth && stats.printSize.height <= albumHeight;
        },

        // Автоматический подбор оптимального размера для альбома
        autoSizeForAlbum: function (photoId) {
            const photo = window.CollageApp.state.photos.find(p => p.id === photoId);
            if (!photo) return;

            const albumWidth = window.CollageApp.state.albumWidth;
            const albumHeight = window.CollageApp.state.albumHeight;

            // Ищем наибольший стандартный размер, который помещается
            const sizes = ['large', 'medium', 'small'];
            let bestSize = 'small';

            for (const size of sizes) {
                const sizeConfig = window.CollageApp.config.defaultPhotoSizes[size];
                if (sizeConfig.width <= albumWidth && sizeConfig.height <= albumHeight) {
                    bestSize = size;
                    break;
                }
            }

            photo.size = bestSize;

            this.currentPhoto = photo;
            this.updateCollagePhotos();
            this.updatePhotoGalleryInfo();

            window.CollageApp.showNotification(`Размер фотографии установлен: ${bestSize}`, 'success');
        }
    };

    // Инициализация модуля
    PhotoManager.init();

    // Переопределяем метод showPhotoSettings в основном приложении
    if (window.CollageApp) {
        window.CollageApp.showPhotoSettings = function (photoId) {
            PhotoManager.showSettings(photoId);
        };
    }

    // Экспорт для глобального использования
    window.PhotoManager = PhotoManager;
});
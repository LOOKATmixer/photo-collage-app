<?php
/**
 * API для загрузки фотографий
 */

require_once '../config/config.php';

// Разрешаем только POST запросы
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse('Метод не поддерживается', 405);
}

// Проверяем наличие файла
if (!isset($_FILES['photo']) || empty($_FILES['photo']['name'])) {
    sendErrorResponse('Файл не выбран');
}

$file = $_FILES['photo'];

try {
    // Валидируем файл
    $validationErrors = Config::validateUploadedFile($file);
    if (!empty($validationErrors)) {
        sendErrorResponse('Ошибки валидации', 400, $validationErrors);
    }

    // Генерируем безопасное имя файла
    $safeFilename = Config::generateSafeFilename($file['name']);
    $filePath = PHOTOS_PATH . '/' . $safeFilename;

    // Перемещаем файл
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Не удалось сохранить файл');
    }

    // Получаем информацию об изображении
    $imageInfo = getimagesize($filePath);
    if (!$imageInfo) {
        unlink($filePath);
        throw new Exception('Не удалось получить информацию об изображении');
    }

    // Создаем миниатюру
    $thumbnailPath = createThumbnail($filePath, $safeFilename);

    // Оптимизируем изображение
    optimizeImage($filePath, $imageInfo['mime']);

    // Возвращаем информацию о загруженном файле
    sendJsonResponse([
        'success' => true,
        'file' => [
            'id' => uniqid('photo_'),
            'name' => $file['name'],
            'filename' => $safeFilename,
            'size' => filesize($filePath),
            'dimensions' => [
                'width' => $imageInfo[0],
                'height' => $imageInfo[1]
            ],
            'mime_type' => $imageInfo['mime'],
            'url' => '/uploads/photos/' . $safeFilename,
            'thumbnail_url' => $thumbnailPath ? '/uploads/photos/thumbs/' . basename($thumbnailPath) : null,
            'uploaded_at' => date('Y-m-d H:i:s')
        ]
    ]);

} catch (Exception $e) {
    logError('Ошибка загрузки файла: ' . $e->getMessage(), [
        'file' => $file['name'],
        'size' => $file['size']
    ]);

    sendErrorResponse('Ошибка загрузки: ' . $e->getMessage(), 500);
}

/**
 * Создание миниатюры изображения
 */
function createThumbnail($imagePath, $filename)
{
    try {
        $thumbsDir = PHOTOS_PATH . '/thumbs';
        if (!is_dir($thumbsDir)) {
            mkdir($thumbsDir, 0755, true);
        }

        $imageInfo = getimagesize($imagePath);
        $mimeType = $imageInfo['mime'];

        // Создаем ресурс изображения
        switch ($mimeType) {
            case 'image/jpeg':
                $source = imagecreatefromjpeg($imagePath);
                break;
            case 'image/png':
                $source = imagecreatefrompng($imagePath);
                break;
            case 'image/gif':
                $source = imagecreatefromgif($imagePath);
                break;
            case 'image/webp':
                if (function_exists('imagecreatefromwebp')) {
                    $source = imagecreatefromwebp($imagePath);
                } else {
                    return null;
                }
                break;
            default:
                return null;
        }

        if (!$source) {
            return null;
        }

        $originalWidth = imagesx($source);
        $originalHeight = imagesy($source);

        // Рассчитываем размеры миниатюры
        $thumbSize = THUMBNAIL_SIZE;
        if ($originalWidth > $originalHeight) {
            $thumbWidth = $thumbSize;
            $thumbHeight = intval($originalHeight * $thumbSize / $originalWidth);
        } else {
            $thumbHeight = $thumbSize;
            $thumbWidth = intval($originalWidth * $thumbSize / $originalHeight);
        }

        // Создаем миниатюру
        $thumb = imagecreatetruecolor($thumbWidth, $thumbHeight);

        // Сохраняем прозрачность для PNG и GIF
        if ($mimeType === 'image/png' || $mimeType === 'image/gif') {
            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
            $transparent = imagecolorallocatealpha($thumb, 255, 255, 255, 127);
            imagefill($thumb, 0, 0, $transparent);
        }

        imagecopyresampled($thumb, $source, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $originalWidth, $originalHeight);

        // Сохраняем миниатюру
        $thumbPath = $thumbsDir . '/' . $filename;
        $success = false;

        switch ($mimeType) {
            case 'image/jpeg':
                $success = imagejpeg($thumb, $thumbPath, QUALITY_JPEG);
                break;
            case 'image/png':
                $success = imagepng($thumb, $thumbPath, 9);
                break;
            case 'image/gif':
                $success = imagegif($thumb, $thumbPath);
                break;
            case 'image/webp':
                if (function_exists('imagewebp')) {
                    $success = imagewebp($thumb, $thumbPath, QUALITY_WEBP);
                }
                break;
        }

        imagedestroy($source);
        imagedestroy($thumb);

        return $success ? $thumbPath : null;

    } catch (Exception $e) {
        logError('Ошибка создания миниатюры: ' . $e->getMessage());
        return null;
    }
}

/**
 * Оптимизация изображения
 */
function optimizeImage($imagePath, $mimeType)
{
    try {
        // Создаем ресурс изображения
        switch ($mimeType) {
            case 'image/jpeg':
                $image = imagecreatefromjpeg($imagePath);
                if ($image) {
                    imagejpeg($image, $imagePath, QUALITY_JPEG);
                    imagedestroy($image);
                }
                break;
            case 'image/webp':
                if (function_exists('imagecreatefromwebp') && function_exists('imagewebp')) {
                    $image = imagecreatefromwebp($imagePath);
                    if ($image) {
                        imagewebp($image, $imagePath, QUALITY_WEBP);
                        imagedestroy($image);
                    }
                }
                break;
            case 'image/png':
                $image = imagecreatefrompng($imagePath);
                if ($image) {
                    imagealphablending($image, false);
                    imagesavealpha($image, true);
                    imagepng($image, $imagePath, 9);
                    imagedestroy($image);
                }
                break;
        }
    } catch (Exception $e) {
        logError('Ошибка оптимизации изображения: ' . $e->getMessage());
    }
}

?>
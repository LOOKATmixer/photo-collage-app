<?php
/**
 * API для сохранения проекта коллажа
 */

require_once '../config/config.php';

// Разрешаем только POST запросы
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse('Метод не поддерживается', 405);
}

// Проверяем наличие данных проекта
if (!isset($_POST['project']) || empty($_POST['project'])) {
    sendErrorResponse('Данные проекта не переданы');
}

try {
    // Декодируем данные проекта
    $projectData = json_decode($_POST['project'], true);
    if (!$projectData) {
        throw new Exception('Неверный формат данных проекта');
    }

    // Валидируем структуру проекта
    $validationErrors = validateProjectData($projectData);
    if (!empty($validationErrors)) {
        sendErrorResponse('Ошибки валидации проекта', 400, $validationErrors);
    }

    // Генерируем ID проекта
    $projectId = uniqid('project_' . date('Ymd_His') . '_');
    $projectData['id'] = $projectId;
    $projectData['created_at'] = date('Y-m-d H:i:s');
    $projectData['updated_at'] = date('Y-m-d H:i:s');

    // Сохраняем проект
    $projectFile = PROJECTS_PATH . '/' . $projectId . '.json';
    if (!file_put_contents($projectFile, json_encode($projectData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        throw new Exception('Не удалось сохранить проект');
    }

    // Создаем превью проекта
    $previewPath = createProjectPreview($projectData, $projectId);

    // Возвращаем результат
    sendJsonResponse([
        'success' => true,
        'project' => [
            'id' => $projectId,
            'created_at' => $projectData['created_at'],
            'preview_url' => $previewPath ? '/uploads/projects/previews/' . basename($previewPath) : null,
            'photo_count' => count($projectData['collagePhotos']),
            'album_size' => $projectData['albumWidth'] . 'x' . $projectData['albumHeight'] . ' см'
        ]
    ]);

} catch (Exception $e) {
    logError('Ошибка сохранения проекта: ' . $e->getMessage(), [
        'project_data' => isset($projectData) ? $projectData : null
    ]);

    sendErrorResponse('Ошибка сохранения: ' . $e->getMessage(), 500);
}

/**
 * Валидация данных проекта
 */
function validateProjectData($projectData)
{
    $errors = [];

    // Проверяем обязательные поля
    $requiredFields = ['albumWidth', 'albumHeight', 'photos', 'collagePhotos'];
    foreach ($requiredFields as $field) {
        if (!isset($projectData[$field])) {
            $errors[] = "Отсутствует обязательное поле: $field";
        }
    }

    if (!empty($errors)) {
        return $errors;
    }

    // Проверяем размеры альбома
    $albumWidth = floatval($projectData['albumWidth']);
    $albumHeight = floatval($projectData['albumHeight']);

    if ($albumWidth <= 0 || $albumWidth > 100) {
        $errors[] = 'Неверная ширина альбома (должна быть от 1 до 100 см)';
    }

    if ($albumHeight <= 0 || $albumHeight > 100) {
        $errors[] = 'Неверная высота альбома (должна быть от 1 до 100 см)';
    }

    // Проверяем количество фотографий
    if (count($projectData['photos']) > MAX_PHOTOS_PER_PROJECT) {
        $errors[] = 'Слишком много фотографий (максимум ' . MAX_PHOTOS_PER_PROJECT . ')';
    }

    // Проверяем структуру фотографий
    foreach ($projectData['photos'] as $index => $photo) {
        if (!isset($photo['id']) || !isset($photo['name'])) {
            $errors[] = "Неверная структура фотографии #$index";
        }
    }

    // Проверяем структуру элементов коллажа
    foreach ($projectData['collagePhotos'] as $index => $collagePhoto) {
        $requiredCollageFields = ['id', 'photoId', 'x', 'y', 'width', 'height'];
        foreach ($requiredCollageFields as $field) {
            if (!isset($collagePhoto[$field])) {
                $errors[] = "Отсутствует поле $field в элементе коллажа #$index";
            }
        }
    }

    return $errors;
}

/**
 * Создание превью проекта
 */
function createProjectPreview($projectData, $projectId)
{
    try {
        $previewsDir = PROJECTS_PATH . '/previews';
        if (!is_dir($previewsDir)) {
            mkdir($previewsDir, 0755, true);
        }

        // Размеры превью
        $previewWidth = 400;
        $previewHeight = 300;

        // Создаем холст для превью
        $preview = imagecreatetruecolor($previewWidth, $previewHeight);
        $white = imagecolorallocate($preview, 255, 255, 255);
        $gray = imagecolorallocate($preview, 200, 200, 200);
        $border = imagecolorallocate($preview, 150, 150, 150);

        // Заливаем фон
        imagefill($preview, 0, 0, $white);

        // Рисуем сетку
        for ($x = 0; $x < $previewWidth; $x += 20) {
            imageline($preview, $x, 0, $x, $previewHeight, $gray);
        }
        for ($y = 0; $y < $previewHeight; $y += 20) {
            imageline($preview, 0, $y, $previewWidth, $y, $gray);
        }

        // Рассчитываем масштаб
        $albumWidth = $projectData['albumWidth'] * 37.8; // пиксели
        $albumHeight = $projectData['albumHeight'] * 37.8;

        $scaleX = $previewWidth / $albumWidth;
        $scaleY = $previewHeight / $albumHeight;
        $scale = min($scaleX, $scaleY);

        // Рисуем фотографии коллажа
        foreach ($projectData['collagePhotos'] as $collagePhoto) {
            $x = intval($collagePhoto['x'] * $scale);
            $y = intval($collagePhoto['y'] * $scale);
            $width = intval($collagePhoto['width'] * $scale);
            $height = intval($collagePhoto['height'] * $scale);

            // Рисуем прямоугольник фотографии
            $photoColor = imagecolorallocate($preview,
                rand(100, 200),
                rand(100, 200),
                rand(100, 200)
            );

            imagefilledrectangle($preview, $x, $y, $x + $width, $y + $height, $photoColor);
            imagerectangle($preview, $x, $y, $x + $width, $y + $height, $border);
        }

        // Добавляем информацию о проекте
        $textColor = imagecolorallocate($preview, 50, 50, 50);
        $font = 3;

        $infoText = count($projectData['collagePhotos']) . ' фото';
        imagestring($preview, $font, 10, 10, $infoText, $textColor);

        $sizeText = $projectData['albumWidth'] . 'x' . $projectData['albumHeight'] . ' см';
        imagestring($preview, $font, 10, 25, $sizeText, $textColor);

        // Сохраняем превью
        $previewPath = $previewsDir . '/' . $projectId . '_preview.jpg';
        $success = imagejpeg($preview, $previewPath, 80);

        imagedestroy($preview);

        return $success ? $previewPath : null;

    } catch (Exception $e) {
        logError('Ошибка создания превью проекта: ' . $e->getMessage());
        return null;
    }
}

/**
 * Получение списка сохраненных проектов
 */
function getProjectsList()
{
    $projects = [];
    $projectFiles = glob(PROJECTS_PATH . '/*.json');

    foreach ($projectFiles as $file) {
        try {
            $projectData = json_decode(file_get_contents($file), true);
            if ($projectData) {
                $projects[] = [
                    'id' => $projectData['id'],
                    'created_at' => $projectData['created_at'],
                    'updated_at' => $projectData['updated_at'],
                    'photo_count' => count($projectData['collagePhotos']),
                    'album_size' => $projectData['albumWidth'] . 'x' . $projectData['albumHeight'] . ' см',
                    'preview_url' => file_exists(PROJECTS_PATH . '/previews/' . $projectData['id'] . '_preview.jpg')
                        ? '/uploads/projects/previews/' . $projectData['id'] . '_preview.jpg'
                        : null
                ];
            }
        } catch (Exception $e) {
            // Пропускаем поврежденные файлы проектов
            continue;
        }
    }

    // Сортируем по дате создания (новые сначала)
    usort($projects, function ($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    return $projects;
}

// Обработка GET запроса для получения списка проектов
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    sendJsonResponse([
        'success' => true,
        'projects' => getProjectsList()
    ]);
}
?>
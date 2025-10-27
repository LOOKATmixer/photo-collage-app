<?php
/**
 * Конфигурация проекта фотоальбома-коллажа
 */

// Базовые настройки
define('APP_NAME', 'Фотоальбом-коллаж');
define('APP_VERSION', '1.0.0');
define('BASE_PATH', dirname(__DIR__));
define('UPLOAD_PATH', BASE_PATH . '/uploads');

// Настройки безопасности
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
define('ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
]);

// Настройки путей
define('PHOTOS_PATH', UPLOAD_PATH . '/photos');
define('PROJECTS_PATH', UPLOAD_PATH . '/projects');
define('TEMP_PATH', UPLOAD_PATH . '/temp');

// Настройки изображений
define('MAX_IMAGE_WIDTH', 4000);
define('MAX_IMAGE_HEIGHT', 4000);
define('THUMBNAIL_SIZE', 200);
define('QUALITY_JPEG', 85);
define('QUALITY_WEBP', 80);

// Настройки проектов
define('MAX_PHOTOS_PER_PROJECT', 50);
define('PROJECT_EXPIRY_DAYS', 30);

// Настройки отладки
define('DEBUG_MODE', true);
define('LOG_ERRORS', true);
define('ERROR_LOG_PATH', BASE_PATH . '/logs/error.log');

// Класс для работы с конфигурацией
class Config
{

    /**
     * Инициализация системы
     */
    public static function init()
    {
        // Создаем необходимые директории
        self::createDirectories();

        // Настраиваем PHP
        self::configurePHP();

        // Настраиваем обработку ошибок
        self::setupErrorHandling();
    }

    /**
     * Создание необходимых директорий
     */
    private static function createDirectories()
    {
        $directories = [
            UPLOAD_PATH,
            PHOTOS_PATH,
            PROJECTS_PATH,
            TEMP_PATH,
            dirname(ERROR_LOG_PATH)
        ];

        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }

        // Создаем .htaccess для защиты загрузок
        $htaccessContent = "Options -Indexes\nDeny from all\n<Files ~ \"\\.(jpg|jpeg|png|gif|webp)$\">\nAllow from all\n</Files>";
        file_put_contents(UPLOAD_PATH . '/.htaccess', $htaccessContent);
    }

    /**
     * Настройка PHP
     */
    private static function configurePHP()
    {
        // Устанавливаем лимиты
        ini_set('upload_max_filesize', '10M');
        ini_set('post_max_size', '50M');
        ini_set('max_execution_time', 60);
        ini_set('memory_limit', '256M');

        // Настройки безопасности
        ini_set('expose_php', 'Off');

        // Настройки сессий
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_strict_mode', 1);

        // Timezone
        date_default_timezone_set('Europe/Moscow');
    }

    /**
     * Настройка обработки ошибок
     */
    private static function setupErrorHandling()
    {
        if (DEBUG_MODE) {
            error_reporting(E_ALL);
            ini_set('display_errors', 1);
        } else {
            error_reporting(0);
            ini_set('display_errors', 0);
        }

        if (LOG_ERRORS) {
            ini_set('log_errors', 1);
            ini_set('error_log', ERROR_LOG_PATH);
        }
    }

    /**
     * Получение настроек в виде JSON
     */
    public static function getClientConfig()
    {
        return json_encode([
            'maxFileSize' => MAX_FILE_SIZE,
            'allowedExtensions' => ALLOWED_EXTENSIONS,
            'allowedMimeTypes' => ALLOWED_MIME_TYPES,
            'maxPhotosPerProject' => MAX_PHOTOS_PER_PROJECT,
            'thumbnailSize' => THUMBNAIL_SIZE
        ]);
    }

    /**
     * Валидация загружаемого файла
     */
    public static function validateUploadedFile($file)
    {
        $errors = [];

        // Проверяем наличие файла
        if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
            $errors[] = 'Ошибка загрузки файла';
            return $errors;
        }

        // Проверяем размер
        if ($file['size'] > MAX_FILE_SIZE) {
            $errors[] = 'Файл слишком большой. Максимальный размер: ' . (MAX_FILE_SIZE / 1024 / 1024) . 'MB';
        }

        // Проверяем расширение
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_EXTENSIONS)) {
            $errors[] = 'Неподдерживаемый тип файла. Разрешены: ' . implode(', ', ALLOWED_EXTENSIONS);
        }

        // Проверяем MIME тип
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, ALLOWED_MIME_TYPES)) {
            $errors[] = 'Неподдерживаемый MIME тип файла';
        }

        // Проверяем что это действительно изображение
        $imageInfo = getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            $errors[] = 'Файл не является изображением';
        } else {
            // Проверяем размеры
            if ($imageInfo[0] > MAX_IMAGE_WIDTH || $imageInfo[1] > MAX_IMAGE_HEIGHT) {
                $errors[] = 'Изображение слишком большое. Максимальные размеры: ' . MAX_IMAGE_WIDTH . 'x' . MAX_IMAGE_HEIGHT;
            }
        }

        return $errors;
    }

    /**
     * Генерация безопасного имени файла
     */
    public static function generateSafeFilename($originalName)
    {
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $name = pathinfo($originalName, PATHINFO_FILENAME);

        // Очищаем имя от небезопасных символов
        $name = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $name);
        $name = preg_replace('/_+/', '_', $name);
        $name = trim($name, '_');

        // Если имя пустое, генерируем случайное
        if (empty($name)) {
            $name = 'image_' . time();
        }

        // Добавляем уникальный префикс
        $uniqueName = date('Y-m-d_H-i-s') . '_' . uniqid() . '_' . $name . '.' . $ext;

        return $uniqueName;
    }

    /**
     * Получение информации о системе
     */
    public static function getSystemInfo()
    {
        return [
            'php_version' => phpversion(),
            'max_upload_size' => ini_get('upload_max_filesize'),
            'max_post_size' => ini_get('post_max_size'),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'gd_version' => function_exists('gd_info') ? gd_info()['GD Version'] : 'Не установлено',
            'upload_dir_writable' => is_writable(UPLOAD_PATH),
            'disk_free_space' => disk_free_space(BASE_PATH)
        ];
    }
}

// Инициализируем конфигурацию
Config::init();

// Функции-помощники
function sanitizeInput($input)
{
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function generateToken()
{
    if (function_exists('random_bytes')) {
        return bin2hex(random_bytes(32));
    } else {
        // Fallback для PHP < 7.0
        return bin2hex(openssl_random_pseudo_bytes(32));
    }
}

function validateToken($token)
{
    return preg_match('/^[a-f0-9]{64}$/', $token);
}

function logError($message, $context = [])
{
    if (LOG_ERRORS) {
        $logMessage = date('Y-m-d H:i:s') . ' - ' . $message;
        if (!empty($context)) {
            $logMessage .= ' - Context: ' . json_encode($context);
        }
        error_log($logMessage . PHP_EOL, 3, ERROR_LOG_PATH);
    }
}

function sendJsonResponse($data, $httpCode = 200)
{
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function sendErrorResponse($message, $httpCode = 400, $details = null)
{
    $response = ['error' => $message];
    if ($details !== null) {
        $response['details'] = $details;
    }
    sendJsonResponse($response, $httpCode);
}

?>
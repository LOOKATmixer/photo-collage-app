# 🚀 Деплой проекта "Фотоальбом-коллаж"

## GitHub Pages Deploy

### 1. Подготовка репозитория

```bash
# Инициализация Git репозитория
git init
git add .
git commit -m "Initial commit: Photo collage app with Font Awesome and CSS variables"

# Создание репозитория на GitHub
# Зайдите на github.com и создайте новый репозиторий
# Затем добавьте remote origin:
git remote add origin https://github.com/YOUR_USERNAME/photo-collage-app.git
git branch -M main
git push -u origin main
```

### 2. Настройка GitHub Pages

1. **Зайдите в Settings репозитория**
2. **Найдите раздел "Pages" в левом меню**
3. **В разделе "Source" выберите:**
    - Source: "GitHub Actions"
4. **GitHub Actions автоматически запустится**

### 3. Доступ к демо

После успешного деплоя:

- **Демо-версия**: `https://YOUR_USERNAME.github.io/photo-collage-app/`
- **Статическая версия**: `https://YOUR_USERNAME.github.io/photo-collage-app/index-static.html`
- **Описание проекта**: `https://YOUR_USERNAME.github.io/photo-collage-app/demo.html`

## ⚠️ Ограничения GitHub Pages

- **Нет PHP поддержки** - серверные функции недоступны
- **Загрузка файлов** работает только локально (в браузере)
- **Сохранение проектов** недоступно без сервера

## 🔧 PhpStorm FTP Deploy Setup

### 1. Создание FTP конфигурации

1. **Откройте PhpStorm**
2. **File → Settings → Build, Execution, Deployment → Deployment**
3. **Нажмите "+" для создания новой конфигурации**
4. **Выберите тип: "FTP" или "SFTP"**

### 2. Настройки подключения

```
Name: Production Server
Type: FTP/SFTP
FTP Host: your-host.com
Port: 21 (FTP) / 22 (SFTP)
Root path: /public_html или /www
Username: your-username
Password: your-password
```

### 3. Mapping настройки

```
Local path: /path/to/your/project
Deployment path: /
Web path: https://your-domain.com
```

### 4. Автоматический деплой

1. **Tools → Deployment → Automatic Upload**
2. **Или используйте Ctrl+Shift+Alt+X для загрузки текущего файла**

### 5. Исключения для FTP

В настройках Deployment → Options → Excluded Paths добавьте:

```
.git/
.github/
.idea/
node_modules/
*.log
.DS_Store
README.md
DEPLOY.md
```

## 📁 Структура для Production

### Обязательные файлы на сервере:

```
/
├── index.html (основная версия с PHP)
├── demo.html (демо-страница)
├── assets/ (CSS, JS, изображения)
├── plugins/ (Font Awesome)
├── api/ (PHP файлы)
├── config/ (конфигурация PHP)
├── uploads/ (папка для загрузок, 755 права)
└── .htaccess (конфигурация Apache)
```

### Права доступа на сервере:

```bash
chmod 755 uploads/
chmod 755 uploads/photos/
chmod 755 uploads/projects/
chmod 755 uploads/temp/
chmod 755 logs/
chmod 644 *.html *.css *.js
chmod 644 api/*.php
chmod 644 config/*.php
```

## 🌐 Домен и DNS

### Настройка custom domain для GitHub Pages:

1. **В Settings → Pages**
2. **Custom domain: your-domain.com**
3. **Добавьте CNAME файл в корень репозитория:**

```
your-domain.com
```

4. **DNS настройки у регистратора:**

```
Type: CNAME
Name: www
Value: YOUR_USERNAME.github.io

Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

## 🔄 Процесс разработки

### Рабочий процесс:

1. **Разработка локально**
2. **Тестирование в браузере**
3. **Commit и push в GitHub**
4. **Автоматический деплой на GitHub Pages** (для демо)
5. **Ручной деплой на production сервер** (PhpStorm FTP)

### Git Commands:

```bash
# Ежедневная работа
git add .
git commit -m "Feature: description"
git push origin main

# Создание релиза
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## 📊 Мониторинг

### GitHub Actions статус:

- Проверяйте статус деплоя в разделе "Actions"
- Логи сборки доступны для отладки

### Production мониторинг:

- Логи ошибок: `logs/error.log`
- Проверка загрузок: `uploads/photos/`
- Статистика проектов: `uploads/projects/`

## 🛠️ Troubleshooting

### GitHub Pages проблемы:

- **404 ошибка**: Проверьте настройки Pages в Settings
- **CSS не загружается**: Проверьте пути к файлам
- **Actions не запускается**: Проверьте .github/workflows/deploy.yml

### FTP проблемы:

- **Права доступа**: chmod 755 для папок, 644 для файлов
- **PHP ошибки**: Проверьте logs/error.log
- **Загрузка файлов**: Проверьте upload_max_filesize в php.ini

### Полезные команды:

```bash
# Проверка статуса Git
git status
git log --oneline

# Синхронизация с origin
git pull origin main

# Откат изменений
git reset --hard HEAD~1
```

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте Issues в репозитории
2. Создайте новый Issue с описанием проблемы
3. Приложите скриншоты и логи ошибок
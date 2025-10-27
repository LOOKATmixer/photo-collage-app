#!/bin/bash

# 🚀 Скрипт быстрого деплоя "Фотоальбом-коллаж" на GitHub Pages

echo "🚀 Деплой проекта 'Фотоальбом-коллаж' на GitHub Pages"
echo "=================================================="

# Проверяем, инициализирован ли Git
if [ ! -d ".git" ]; then
    echo "📝 Инициализация Git репозитория..."
    git init
    echo "✅ Git репозиторий инициализирован"
else
    echo "✅ Git репозиторий уже инициализирован"
fi

# Добавляем все файлы
echo "📦 Добавление файлов в Git..."
git add .

# Создаем коммит
echo "💾 Создание коммита..."
git commit -m "Deploy: Photo collage app with Font Awesome icons and CSS variables

Features:
- 🎨 Font Awesome icons instead of emoji
- 🎨 CSS variables for all colors in :root
- 📱 Responsive design with BEM methodology
- 🖼️ Photo upload and collage builder
- 🎯 4 auto-layout algorithms
- 💾 Project save/load functionality
- 🌐 Static version for GitHub Pages
- 🔧 PHP backend for full functionality

Tech stack:
- HTML5 + BEM CSS
- JavaScript ES6+ with jQuery
- PHP 7.0+ with GD extension
- Font Awesome 6.0.0
- CSS Grid and Flexbox"

echo "✅ Коммит создан"

# Проверяем, добавлен ли remote origin
if git remote get-url origin &> /dev/null; then
    echo "✅ Remote origin уже настроен"
    
    # Пушим изменения
    echo "🚀 Отправка изменений на GitHub..."
    git push origin main
    echo "✅ Изменения отправлены на GitHub"
else
    echo "⚠️  Remote origin не настроен"
    echo ""
    echo "Пожалуйста, выполните следующие шаги:"
    echo "1. Создайте репозиторий на GitHub"
    echo "2. Выполните команду:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    echo "3. Затем выполните:"
    echo "   git branch -M main"
    echo "   git push -u origin main"
fi

echo ""
echo "📋 Следующие шаги для настройки GitHub Pages:"
echo "1. Зайдите в Settings вашего репозитория на GitHub"
echo "2. Найдите раздел 'Pages' в левом меню"
echo "3. В 'Source' выберите 'GitHub Actions'"
echo "4. GitHub Actions автоматически задеплоит проект"
echo ""
echo "🌐 После деплоя проект будет доступен по адресу:"
echo "   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/"
echo ""
echo "📁 Файлы проекта:"
echo "   • demo.html - демо-страница с описанием"
echo "   • index.html - полная версия (требует PHP)"
echo "   • index-static.html - статическая версия для GitHub Pages"
echo ""
echo "🎉 Удачного деплоя!"
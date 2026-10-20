# CookMate Frontend

Стек: React, TypeScript, Vite, TanStack Router/Query, Zustand, Tailwind CSS.

## Локальная разработка

Используйте Node.js 24 и npm 11.19.1 (как в закреплённом Docker-образе). Из корня монорепозитория:

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Если `.env` уже существует, сохраните его настройки. `VITE_API_BASE_URL` задаёт адрес API, доступный браузеру; пример использует локальный Gateway на порту 8090. Переменные Vite входят в клиентскую сборку: секреты в них хранить нельзя.

```sh
npm run build
npm run lint
npm run preview
```

## Docker

Из корня монорепозитория:

```sh
docker compose up --build frontend
```

Фронтенд доступен на порту 3000. Для сборки с явным адресом API:

```sh
docker compose build --build-arg VITE_API_BASE_URL=http://localhost:8090/api/v1 frontend
docker compose up -d frontend
```

Адрес API задаётся при сборке; для его изменения нужен новый образ. Локальный `.env` не включается в Docker-контекст. `frontend/docker-compose.yml` сохранён из отдельного репозитория и позволяет запускать только фронтенд из этой папки.

## Тестирование

```sh
npm test
npm run test:watch
npm run test:coverage
npm run test:typecheck
```

Тесты Vitest находятся в `src/__tests__/`, используют jsdom и React Testing Library. Проверяются авторизация и регистрация, история ингредиентов, API-контракты, загрузка фотографий, подбор и детали рецептов, избранное, навигация и переключение адаптивных панелей. Страничные тесты используют настоящие роуты и QueryClient, сетевые обращения заменены имитациями API. Backend и ML для запуска не нужны.
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

Фронтенд доступен на порту 3000. По умолчанию nginx контейнера проксирует `/api` на `backend:8080` в сети корневого compose. Для сборки с явным адресом API:

```sh
docker compose build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 frontend
docker compose up -d frontend
```

Адрес API задаётся при сборке; для его изменения нужен новый образ. Локальный `.env` не включается в Docker-контекст. `frontend/docker-compose.yml` запускает только фронтенд. Для работы API в таком режиме нужен доступный сервис `backend` в сети контейнера либо явно заданный при сборке адрес API; при отдельном origin настройте CORS backend.

## Тестирование

```sh
npm test
npm run test:watch
npm run test:coverage
npm run test:typecheck
```

Тесты Vitest находятся в `src/__tests__/`, используют jsdom и React Testing Library. Проверяются авторизация и регистрация, история ингредиентов, API-контракты, загрузка фотографий, подбор и детали рецептов, избранное, навигация и переключение адаптивных панелей. Страничные тесты используют настоящие роуты и QueryClient, сетевые обращения заменены имитациями API. Backend и ML для запуска не нужны.
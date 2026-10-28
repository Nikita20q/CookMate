# CookMate Frontend

Стек: React, TypeScript, Vite, React Hook Form, TanStack Router/Query, Zustand, Tailwind CSS.

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

## Формы и ошибки API

Вход, регистрация, подтверждение почты, добавление ингредиента и загрузка фото используют React Hook Form. Клиентская валидация задаётся через `register`, `Controller` или `useController`; ошибки выводятся компонентом `FormError` из `formState.errors`.

В обработчике неуспешного запроса вызывайте `setApiFormErrors` из `src/lib/form-errors.ts`, передавая исключение, `setError` и список полей формы:

```tsx
try {
  await authApi.login(data.email, data.password);
} catch (error) {
  setApiFormErrors(error, setError, ["email", "password"]);
}
```

Ошибки известных полей попадают в `errors.email`, `errors.password` и другие зарегистрированные поля. Общие сообщения и ошибки неизвестных полей доступны в `errors.root.server.message`. Текущий backend возвращает бизнес-ошибки и валидацию в `message`, поэтому такие сообщения отображаются на уровне формы. Ответы с `errors` или `fieldErrors` поддерживают привязку к полям без изменений форм.

Для запросов вне форм используйте `getApiError` из `src/api/errors.ts`. Он возвращает `message`, `fieldErrors` и HTTP-статус, разбирает текст, `message`, `detail`, вложенный `error`, списки сообщений и ошибки полей. При отсутствии сообщения используются понятные тексты для сетевых ошибок, таймаутов и HTTP-статусов; HTML-страницы ошибок пользователю не выводятся. Исходное исключение Axios сохраняется для существующей обработки сессии.

Пока запрос формы выполняется, отправка заблокирована. При изменении поля сбрасывается его серверная ошибка и общая ошибка формы. Подтверждение почты использует адрес, с которым успешно прошла регистрация.

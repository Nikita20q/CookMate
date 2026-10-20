# CookMate Frontend

Единственный рабочий фронтенд находится в `CookMate/frontend`. Отдельный репозиторий `cookmate` перенесён сюда вместе с историей и локальными изменениями. Backend, Gateway, Parser и ML находятся вне области фронтенд-разработки.

Стек: React, TypeScript, Vite, TanStack Router/Query, Zustand, Tailwind CSS.

## Локальная разработка

Используйте Node.js 24 и npm. Из корня монорепозитория:

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

Зависимости фиксируются в `package-lock.json`. При их изменении используйте npm; устаревший `pnpm-lock.yaml` удалён. Файл `src/routeTree.gen.ts` генерируется TanStack Router при запуске Vite.

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

## Перенос истории

База переноса — `origin/main` монорепозитория (`f41278a`), проверенная на GitHub 20 октября 2026 года. Более новый коммит ветки `origin/Backend` не включался в `main`.

Merge-коммит `915bed2` сохраняет обе истории. Его второй родитель — снимок локальных изменений отдельного фронтенда (`3ab9c91`). Исходные коммиты, включая `2387566` и `d65594e`, сохранены с прежними идентификаторами, авторами и сообщениями. До переноса пути в этой ветке истории относились к корню отдельного репозитория:

```sh
git log --graph --oneline
git log 915bed2^2 -- src/pages/RecipeDetailPage.tsx
```

В соседней с монорепозиторием папке `../.migration-backup` сохранены Git bundles обоих репозиториев, исходные локальные изменения и архив отдельного фронтенда. Архив содержит локальный `.env`; не публикуйте его.

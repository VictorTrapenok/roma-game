# Pixel Jumper (roma-game)

Браузерный 2D-платформер на **React Native Web (Expo)**.
Прыгай, топчи гусей, собирай бицепсы и доберись до флага.
Два раунда: второй длиннее в полтора раза, проходит в пустыне, с восемью
ямами, коврами из шипов и целой армией более быстрых гусей.

## Играбельное демо

После каждого пуша в `main` GitHub Actions собирает статический сайт и
публикует его на GitHub Pages:

**https://victortrapenok.github.io/roma-game/**

> Перед первым деплоем включи Pages: **Settings → Pages → Source → GitHub Actions**.

## Управление

| Действие | Клавиши | Сенсорный экран |
|---|---|---|
| Бег | `A`/`D` или `←`/`→` | кнопки ◀ ▶ |
| Прыжок (длина зависит от удержания) | `W` / `↑` / `Пробел` | кнопка ⤒ |
| Пауза | `Esc` | — |
| Звук вкл/выкл | `M` | кнопка 🔊 |
| Рестарт (в паузе) | `R` | — |

## Локальный запуск

```bash
npm install
npm run web        # dev-сервер с веб-версией
```

## Сборка статического сайта

```bash
npm run export:web   # результат в dist/
npx serve dist       # проверка локально
```

Базовый путь для GitHub Pages задан в `app.json → experiments.baseUrl`
(`/roma-game`). Если переименуешь репозиторий — поменяй и его.

## Структура

```
App.tsx                     — корневой компонент
src/components/GameCanvas.web.tsx — веб-хост: <canvas> + сенсорные кнопки (RN View/Pressable)
src/components/GameCanvas.tsx     — нативная заглушка MVP
src/game/
  level.ts       — геометрия уровня, монеты, враги, шипы, флаг (данные, без рандома)
  world.ts       — AABB-физика по тайловой сетке
  entities.ts    — игрок (койот-тайм, буфер прыжка, переменная высота) и враги-ползуны
  particles.ts   — пул частиц без аллокаций в горячем цикле
  render.ts      — вся отрисовка (canvas 2D, пиксель-арт стиль)
  game.ts        — контроллер: состояния, счёт, камера, жизни
  input.ts       — единое состояние ввода: клавиатура + сенсорные кнопки
  loop.ts        — фиксированный таймстеп 60 Гц
  audio.ts       — синтезированные SFX на Web Audio, без файлов
.github/workflows/deploy.yml — CI/CD: type-check → expo export → GitHub Pages
```

## Roadmap

- [ ] Нативный рендерер на react-native-skia (ядро игры уже платформенно-независимое)
- [ ] Android-сборка через EAS Build (APK/AAB)
- [ ] Больше уровней, чекпоинты, движущиеся платформы
- [ ] Таблица рекордов

## Технологии

Expo SDK 52 · React Native Web · TypeScript · canvas 2D · GitHub Actions

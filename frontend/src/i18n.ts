import { useSyncExternalStore } from 'react'

// English is the source text and the key. A text missing here is a compile error at its `t()`.
const RU = {
  // App
  Games: 'Игры',
  Tools: 'Инструменты',
  Language: 'Язык',
  Builds: 'Билды',
  Relics: 'Реликвии',
  Wishes: 'Молитвы',
  History: 'История',
  'Fan project. Not affiliated with HoYoverse.': 'Фанатский проект. Не связан с HoYoverse.',
  'Something went wrong here.': 'Здесь что-то пошло не так.',
  Reload: 'Перезагрузить',
  // Requests
  'The server took too long to answer. Try again.': 'Сервер отвечает слишком долго. Попробуйте ещё раз.',
  'Could not reach the server. Check your connection.':
    'Не удалось связаться с сервером. Проверьте соединение.',
  'Loading…': 'Загрузка…',
  'Calculating…': 'Считаем…',
  Calculate: 'Рассчитать',
  // Showcases
  'Character builds': 'Билды персонажей',
  'Load characters': 'Загрузить персонажей',
  '9 or 10 digits': '9 или 10 цифр',
  'Honkai: Star Rail · characters from your profile\'s showcase':
    'Honkai: Star Rail · персонажи с витрины вашего профиля',
  'Trailblaze Lv. {level} · Equilibrium {equilibrium}':
    'Уровень Освоения {level} · Равновесие {equilibrium}',
  Achievements: 'Достижения',
  Characters: 'Персонажи',
  'Light Cones': 'Световые конусы',
  '(+N): skill levels that eidolons add.': '(+N): уровни навыков, которые добавляют эйдолоны.',
  'Lv. {level}': 'Ур. {level}',
  'Relics ({count}) · score {score}': 'Реликвии ({count}) · оценка {score}',
  '×N: how many times the substat rolled, the first roll included. Score: the wanted substats in perfect rolls, so 2.0 is worth two highest rolls.':
    '×N: сколько раз выпал доп. стат, считая первый раз. Оценка: нужные доп. статы в идеальных роллах, 2.0 равно двум максимальным роллам.',
  'Substats that matter': 'Важные доп. статы',
  'Score {score}': 'Оценка {score}',
  '{slot} substats': '{slot}: доп. статы',
  'No characters to show. In the game, open your profile, add characters to the Character Showcase and let other players see their details.':
    'Персонажей нет. В игре откройте профиль, добавьте персонажей на витрину и разрешите другим игрокам видеть их детали.',
  // Relic advisor
  'Relic advisor': 'Советник по реликвиям',
  'Honkai: Star Rail · is a 5★ relic worth leveling? Exact chances, not a simulation.':
    'Honkai: Star Rail · стоит ли качать реликвию 5★? Точные шансы, не симуляция.',
  'Main stat': 'Главный стат',
  Level: 'Уровень',
  Choose: 'Выберите',
  'Substat {slot}': 'Доп. стат {slot}',
  'Value {slot}': 'Значение {slot}',
  'None (3 substats)': 'Нет (3 доп. стата)',
  'Values as the game shows them: 5.8 for 5.8%. They are only needed to compare relics or to set a goal. The game rounds values down, so the answer is slightly cautious.':
    'Значения как в игре: 5.8 для 5.8%. Они нужны только для сравнения реликвий и для цели. Игра округляет значения вниз, поэтому ответ немного занижен.',
  'Substats you want': 'Нужные доп. статы',
  'Goal stat': 'Стат для цели',
  'No goal': 'Без цели',
  'Goal value': 'Значение цели',
  'Compare with': 'Сравнить с',
  Nothing: 'Не сравнивать',
  'Load your characters in Builds to compare with a relic they wear.':
    'Загрузите персонажей в «Билдах», чтобы сравнить с надетой реликвией.',
  'Pick at least one substat you want, or set a goal.':
    'Отметьте хотя бы один нужный доп. стат или задайте цель.',
  '{count} upgrades left': 'Осталось улучшений: {count}',
  '1 upgrade left': 'Осталось 1 улучшение',
  '{average} on average go to the substats you want':
    'в среднем {average} попадут в нужные доп. статы',
  'Score now': 'Оценка сейчас',
  'Chance to beat the equipped relic': 'Шанс обойти надетую реликвию',
  'Chance to reach {goal}': 'Шанс дойти до {goal}',
  'Wanted upgrades': 'Нужные улучшения',
  Chance: 'Шанс',
  'At least {count}': 'Не меньше {count}',
  // Star Rail terms, as the game's Russian version names them
  HP: 'HP',
  ATK: 'Сила атаки',
  DEF: 'Защита',
  SPD: 'Скорость',
  'CRIT Rate': 'Крит. шанс',
  'CRIT DMG': 'Крит. урон',
  'Effect Hit Rate': 'Шанс попадания эффектов',
  'Effect RES': 'Сопротивление эффектам',
  'Break Effect': 'Эффект пробития',
  'Energy Regen': 'Восстановление энергии',
  'Outgoing Healing': 'Бонус исцеления',
  'Physical DMG': 'Физический урон',
  'Fire DMG': 'Огненный урон',
  'Ice DMG': 'Ледяной урон',
  'Lightning DMG': 'Электрический урон',
  'Wind DMG': 'Ветряной урон',
  'Quantum DMG': 'Квантовый урон',
  'Imaginary DMG': 'Мнимый урон',
  Head: 'Голова',
  Hands: 'Руки',
  Body: 'Тело',
  Feet: 'Ноги',
  'Planar Sphere': 'Планарная сфера',
  'Link Rope': 'Соединительная верёвка',
  Physical: 'Физический',
  Fire: 'Огненный',
  Ice: 'Ледяной',
  Lightning: 'Электрический',
  Wind: 'Ветряной',
  Quantum: 'Квантовый',
  Imaginary: 'Мнимый',
  Destruction: 'Разрушение',
  'The Hunt': 'Охота',
  Erudition: 'Эрудиция',
  Harmony: 'Гармония',
  Nihility: 'Небытие',
  Preservation: 'Сохранение',
  Abundance: 'Изобилие',
  Remembrance: 'Память',
  Elation: 'Радость',
  'Basic ATK': 'Базовая атака',
  Skill: 'Навык',
  Ultimate: 'Сверхспособность',
  Talent: 'Талант',
  'Memosprite Skill': 'Навык духа памяти',
  'Memosprite Talent': 'Талант духа памяти',
  // Character page
  'Skills and eidolons': 'Навыки и эйдолоны',
  '← All characters': '← Все персонажи',
  Skills: 'Навыки',
  Eidolons: 'Эйдолоны',
  Unlocked: 'Открыт',
  'Not unlocked': 'Не открыт',
  'This app has no texts for this character yet.': 'Для этого персонажа пока нет описаний.',
} as const

export type Message = keyof typeof RU
export type Translate = (message: Message, values?: Readonly<Record<string, string | number>>) => string

const LANGUAGES = { en: 'EN', ru: 'RU' } as const
export type Language = keyof typeof LANGUAGES
export const languages = Object.keys(LANGUAGES).filter((key): key is Language => key in LANGUAGES)
export const languageLabel = (language: Language): string => LANGUAGES[language]

const STORAGE_KEY = 'language'
const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && Object.hasOwn(LANGUAGES, value)

/** The saved choice, else the browser's language, else English. */
function initialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Storage is off: fall through to the browser's language.
  }
  const [browser = ''] = navigator.language.split('-')
  return isLanguage(browser) ? browser : 'en'
}

let current = initialLanguage()
const listeners = new Set<() => void>()

export function setLanguage(language: Language): void {
  current = language
  document.documentElement.lang = language
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // The choice then lasts until the page closes.
  }
  for (const notify of listeners) notify()
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify)
  return (): void => {
    listeners.delete(notify)
  }
}

export const translate = (
  language: Language,
  message: Message,
  values: Readonly<Record<string, string | number>> = {},
): string =>
  Object.entries(values).reduce<string>(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    language === 'ru' ? RU[message] : message,
  )

export const useLanguage = (): Language => useSyncExternalStore(subscribe, () => current)

/** `t('Text')` gives the text in the language the player chose. */
export function useT(): Translate {
  const language = useLanguage()
  return (message, values) => translate(language, message, values)
}

/** For text that arrives as a plain string, such as an error: translated when it is a known one. */
export function useLocalized(): (text: string) => string {
  const language = useLanguage()
  return (text) => (Object.hasOwn(RU, text) ? translate(language, text as Message) : text)
}

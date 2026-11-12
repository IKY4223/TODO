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
  'Honkai: Star Rail · is a relic worth leveling? Exact chances, not a simulation.':
    'Honkai: Star Rail · стоит ли качать реликвию? Точные шансы, не симуляция.',
  Rarity: 'Редкость',
  'Main stat': 'Главный стат',
  Level: 'Уровень',
  Choose: 'Выберите',
  'Substat {slot}': 'Доп. стат {slot}',
  'Value {slot}': 'Значение {slot}',
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
  // Genshin tools
  'Genshin Impact · characters from your in-game showcase':
    'Genshin Impact · персонажи с витрины в игре',
  'AR {rank}': 'Ранг приключений {rank}',
  'Talents {levels}': 'Таланты {levels}',
  'Artifacts ({count})': 'Артефакты ({count})',
  'No characters to show. In the game, open your profile, add characters to the showcase and turn on Show Character Details.':
    'Персонажей нет. В игре откройте профиль, добавьте персонажей на витрину и включите «Показывать детали персонажей».',
  Damage: 'Урон',
  'Talent multiplier, %': 'Множитель таланта, %',
  'Scales with': 'Зависит от',
  'Damage bonus': 'Бонус урона',
  None: 'Нет',
  Reaction: 'Реакция',
  'Enemy level': 'Уровень врага',
  'Enemy resistance, %': 'Сопротивление врага, %',
  'Calculate damage': 'Рассчитать урон',
  Average: 'В среднем',
  Crit: 'Крит',
  'Non-crit': 'Без крита',
  'Elemental Mastery': 'Мастерство стихий',
  'Vaporize / Melt ×1.5': 'Пар / Таяние ×1.5',
  'Vaporize / Melt ×2': 'Пар / Таяние ×2',
  'Wish forecast': 'Прогноз молитв',
  'Honkai: Star Rail · limited warps': 'Honkai: Star Rail · лимитированные прыжки',
  Banner: 'Баннер',
  'Character Event Warp': 'Прыжок события: персонаж',
  'Light Cone Event Warp': 'Прыжок события: световой конус',
  Warps: 'Прыжки',
  'Warp forecast': 'Прогноз прыжков',
  'Genshin Impact · limited character banner': 'Genshin Impact · баннер лимитированного персонажа',
  'Pulls since last 5★': 'Молитв после последнего 5★',
  'Next 5★ is guaranteed': 'Следующий 5★ гарантирован',
  'Pulls available': 'Доступно молитв',
  Target: 'Цель',
  'Could not calculate: {reason}': 'Не удалось рассчитать: {reason}',
  'chance to reach your target': 'шанс получить цель',
  'Pulls needed': 'Сколько нужно молитв',
  Pulls: 'Молитвы',
  'Wish history': 'История молитв',
  'Genshin Impact · global servers · saved only on this device':
    'Genshin Impact · глобальные серверы · хранится только на этом устройстве',
  '{count} pulls since the last 5★': 'Молитв после последнего 5★: {count}',
  '{total} pulls in total · {count} since the last 4★': 'Всего молитв: {total} · после последнего 4★: {count}',
  '5★ pulls, newest first': '5★, сначала новые',
  Name: 'Имя',
  Pity: 'Гарант',
  'How to get the link on Android': 'Как получить ссылку на Android',
  'In the game, open Wish and tap History. Wait for it to load.':
    'В игре откройте «Молитва» и нажмите «История». Дождитесь загрузки.',
  'Turn off Wi-Fi and mobile data.': 'Выключите Wi-Fi и мобильный интернет.',
  'Tap refresh at the top right. An error page appears.':
    'Нажмите «обновить» справа вверху. Появится страница с ошибкой.',
  'Press and hold its text, tap Select all, then Copy.':
    'Зажмите текст, выберите «Выделить всё», затем «Копировать».',
  'Turn the connection back on and paste the text below.':
    'Включите интернет и вставьте текст ниже.',
  'On iPhone': 'На iPhone',
  'The game gives iPhones no simple way to copy the link. Apps that record your traffic can capture it, but they need a certificate that lets them read everything your phone sends. Install one only from an app you trust, and remove it afterwards.':
    'На iPhone игра не даёт простого способа скопировать ссылку. Её могут перехватить приложения, записывающие трафик, но им нужен сертификат, который позволяет читать всё, что отправляет телефон. Ставьте его только из приложения, которому доверяете, и потом удалите.',
  'Text from the error page': 'Текст со страницы ошибки',
  'The link lets anyone read your wish history for about a day. This app uses it for the import and never keeps it.':
    'По ссылке любой может читать вашу историю молитв примерно сутки. Приложение использует её для импорта и не хранит.',
  'Import history': 'Импортировать историю',
  'Delete saved history': 'Удалить сохранённую историю',
  'Delete the saved wish history from this device? Pulls older than a year cannot be imported again.':
    'Удалить сохранённую историю молитв с этого устройства? Молитвы старше года нельзя импортировать заново.',
  ' This browser does not keep site data, so the history lasts until this page closes.':
    ' Браузер не хранит данные сайта, поэтому история пропадёт, когда страница закроется.',
  'No pulls found for this link.': 'По этой ссылке молитв не найдено.',
  '{count} new pulls imported.': 'Импортировано новых молитв: {count}.',
  'No new pulls.': 'Новых молитв нет.',
  '{banner}: {count} pulls read': '{banner}: прочитано молитв: {count}',
  'Character Event': 'Ивент персонажа',
  'Weapon Event': 'Ивент оружия',
  'Chronicled Wish': 'Молитва хроник',
  Standard: 'Стандартная',
  "Beginners' Wish": 'Молитва новичка',
  EM: 'МС',
  ER: 'Восст. энергии',
  Healing: 'Бонус лечения',
  'Pyro DMG': 'Пиро урон',
  'Hydro DMG': 'Гидро урон',
  'Electro DMG': 'Электро урон',
  'Cryo DMG': 'Крио урон',
  'Anemo DMG': 'Анемо урон',
  'Geo DMG': 'Гео урон',
  'Dendro DMG': 'Дендро урон',
  Pyro: 'Пиро',
  Hydro: 'Гидро',
  Electro: 'Электро',
  Cryo: 'Крио',
  Anemo: 'Анемо',
  Geo: 'Гео',
  Dendro: 'Дендро',
  Flower: 'Цветок',
  Plume: 'Перо',
  Sands: 'Пески',
  Goblet: 'Кубок',
  Circlet: 'Корона',
  // Messages the server sends
  'This level is above the highest a relic of this rarity reaches.':
    'Этот уровень выше максимума для реликвии такой редкости.',
  'A relic of this rarity and level has more substats than that.':
    'У реликвии такой редкости и уровня доп. статов больше.',
  'A relic cannot have the same substat twice.': 'У реликвии не бывает двух одинаковых доп. статов.',
  'A substat cannot be the same as the main stat.': 'Доп. стат не может совпадать с главным.',
  'Enka.Network does not accept this UID.': 'Enka.Network не принимает этот UID.',
  'Enka.Network is not responding. Try again later.': 'Enka.Network не отвечает. Попробуйте позже.',
  'Enka.Network sent data this app cannot read.': 'Enka.Network прислал данные, которые приложение не может прочитать.',
  'Enter the current value of the stat you set a goal for.': 'Введите текущее значение стата, для которого задана цель.',
  'Enter the value of every substat you want, to compare relics.':
    'Чтобы сравнить реликвии, введите значения всех нужных доп. статов.',
  'HoYoverse is not responding. Try again later.': 'HoYoverse не отвечает. Попробуйте позже.',
  'HoYoverse sent an answer this app cannot read. Try again later.':
    'HoYoverse прислал ответ, который приложение не может прочитать. Попробуйте позже.',
  'One of these stats never appears as a substat.': 'Один из этих статов не бывает доп. статом.',
  'Player not found. Check the UID.': 'Игрок не найден. Проверьте UID.',
  'The game is under maintenance. Try again later.': 'В игре техработы. Попробуйте позже.',
  'The goal must be a stat this relic can have as a substat.':
    'Цель должна быть статом, который может быть доп. статом этой реликвии.',
  'This link has expired: they last about a day. Get a new one from the game.':
    'Ссылка устарела: она живёт около суток. Получите новую в игре.',
  "This link is not valid. Copy it again from the game's wish history.":
    'Ссылка неверная. Скопируйте её заново из истории молитв в игре.',
  'Too many requests to Enka.Network. Try again in a minute.':
    'Слишком много запросов к Enka.Network. Попробуйте через минуту.',
  'Too many requests to HoYoverse. Waiting a moment before trying again.':
    'Слишком много запросов к HoYoverse. Немного ждём и пробуем снова.',
  'Unknown character': 'Неизвестный персонаж',
  'Unknown light cone': 'Неизвестный световой конус',
  'Unknown set': 'Неизвестный набор',
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
  Traces: 'Следы',
  'Materials to max skills and traces': 'Материалы до максимума навыков и следов',
  'Everything is at its highest level.': 'Всё прокачано до максимума.',
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

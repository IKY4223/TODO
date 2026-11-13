import { useSyncExternalStore } from 'react'

// English is the source text and the key. A text missing here is a compile error at its `t()`.
const RU = {
  // App
  Menu: 'Меню',
  'Close menu': 'Закрыть меню',
  Tools: 'Инструменты',
  Language: 'Язык',
  Settings: 'Настройки',
  Theme: 'Тема',
  'As on the device': 'Как на устройстве',
  Dark: 'Тёмная',
  Light: 'Светлая',
  Builds: 'Билды',
  Relics: 'Реликвии',
  Wishes: 'Молитвы',
  History: 'История',
  'Fan project. Not affiliated with HoYoverse.': 'Фанатский проект. Не связан с HoYoverse.',
  'Something went wrong here.': 'Здесь что-то пошло не так.',
  Reload: 'Перезагрузить',
  // Requests
  'The server took too long to answer. Try again.':
    'Сервер отвечает слишком долго. Попробуйте ещё раз.',
  'Could not reach the server. Check your connection.':
    'Не удалось связаться с сервером. Проверьте соединение.',
  'Loading…': 'Загрузка…',
  'Calculating…': 'Считаем…',
  Calculate: 'Рассчитать',
  // Showcases
  'Character builds': 'Билды персонажей',
  'Load characters': 'Загрузить персонажей',
  '9 or 10 digits': '9 или 10 цифр',
  "Honkai: Star Rail · characters from your profile's showcase":
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
  // Warp names as the exporter biuuu/star-rail-warp-export words them in Russian.
  'Character Collaboration Warp': 'Совместный прыжок события: персонаж',
  'Light Cone Collaboration Warp': 'Совместный прыжок события: световой конус',
  'Regular Warp': 'Стандартный прыжок',
  'Starter Warp': 'Прыжок новичка',
  'Warp history': 'История прыжков',
  'Honkai: Star Rail · global servers · saved only on this device':
    'Honkai: Star Rail · глобальные серверы · хранится только на этом устройстве',
  'The link lets anyone read your warp history for about a day. This app uses it for the import and never keeps it.':
    'По ссылке любой может читать вашу историю прыжков около суток. Приложение использует её для импорта и не сохраняет.',
  'Or from a UIGF or SRGF file': 'Или из файла UIGF или SRGF',
  'UIGF or SRGF file': 'Файл UIGF или SRGF',
  'This file is not a UIGF or SRGF file.': 'Это не файл UIGF или SRGF.',
  'This file holds no Star Rail warps.': 'В этом файле нет прыжков Star Rail.',
  'This file does not say the star rank of each warp: export it again with every field.':
    'В файле не указана редкость прыжков: выгрузите его заново со всеми полями.',
  'This file is too large to be a warp history.': 'Файл слишком большой для истории прыжков.',
  '{count} new warps imported.': 'Импортировано новых прыжков: {count}.',
  'No new warps.': 'Новых прыжков нет.',
  'No warps found for this link.': 'По этой ссылке прыжков не найдено.',
  '{banner}: {count} warps read': '{banner}: прочитано прыжков: {count}',
  'This file could not be read.': 'Не удалось прочитать файл.',
  'This browser kept its saved data: the history may come back on reload.':
    'Браузер не удалил сохранённые данные: история может вернуться после перезагрузки.',
  '{count} warps since the last 5★': 'Прыжков после последнего 5★: {count}',
  '{total} warps in total · {count} since the last 4★':
    'Всего прыжков: {total} · после последнего 4★: {count}',
  Account: 'Аккаунт',
  'Delete the saved warp history from this device?':
    'Удалить сохранённую историю прыжков с этого устройства?',
  Warps: 'Прыжки',
  Speed: 'Скорость',
  'Team speed': 'Скорость команды',
  'Honkai: Star Rail · turns in Memory of Chaos: the first cycle lasts 150 action value, each later one 100.':
    'Honkai: Star Rail · ходы в Зале забвения: первый цикл длится 150 ед. действия, каждый следующий 100.',
  'Turns by cycle {cycle}': 'Ходов к концу цикла {cycle}',
  'Without effects: one more turn in cycle 0 at {speed} SPD (+{missing})':
    'Без эффектов: ещё один ход в цикле 0 при скорости {speed} (+{missing})',
  Team: 'Команда',
  "Effect values: skills at the character's levels, light cones at their superimposition. Skills are taken as used every turn.":
    'Числа эффектов: навыки на уровнях персонажа, конусы по их наложению. Считается, что навык применяется каждый ход.',
  'Ultimate every N turns': 'Сверхспособность раз в N ходов',
  Never: 'Никогда',
  'Chosen ally': 'Выбранный союзник',
  'Effects in battle': 'Эффекты в бою',
  'Turn order': 'Очередь ходов',
  'Cycle {cycle}': 'Цикл {cycle}',
  'Memosprite of {name}': 'Дух памяти: {name}',
  'Summon of {name}': 'Призыв: {name}',
  'Countdown of {name}': 'Отсчёт: {name}',
  '{set} on a teammate': '{set} у союзника',
  // Official names, from the game's Russian texts (StarRailRes).
  'Fleet of the Ageless': 'Флот нестареющих',
  'Broken Keel': 'Сломанный киль',
  'at Effect RES {tiers}': 'при сопротивлении эффектам {tiers}',
  'Own summon': 'Свой призыв',
  'comes in with {value} action(s)': 'появляется, действий: {value}',
  'until its countdown acts': 'до хода отсчёта',
  'On entering its state': 'При входе в особое состояние',
  Enemies: 'Враги',
  Enemy: 'Враг',
  'Enemy SPD': 'Скорость врага',
  'No effects on the turn order are known for this character yet.':
    'Эффекты этого персонажа на порядок ходов пока не известны.',
  'No enemy': 'Без врага',
  'action delay +{value}': 'задержка хода +{value}',
  'SPD −{value}': 'скорость −{value}',
  '{value} stack(s)': 'стаков: {value}',
  once: 'один раз',
  'from Eidolon {eidolon}': 'с эйдолона {eidolon}',
  'by Elation characters on the team': 'по числу персонажей Радости в команде',
  'outside its state': 'вне особого состояния',
  'At battle start': 'В начале боя',
  'Every turn': 'Каждый ход',
  'On Ultimate': 'При сверхспособности',
  Always: 'Всегда',
  "On the memosprite's turn": 'В ход духа памяти',
  Self: 'Сам',
  'All allies': 'Все союзники',
  Teammates: 'Союзники',
  'action advance +{value}': 'ускорение хода +{value}',
  'SPD +{value}': 'скорость +{value}',
  'lasts {turns} turn(s)': 'ходов: {turns}',
  'SPD at least {spd}': 'скорость от {spd}',
  'at SPD {tiers}': 'при скорости от {tiers}',
  'below SPD {tiers}': 'при скорости ниже {tiers}',
  'Stats with the effects switched on. Effects that depend on SPD switch on by themselves.':
    'Статы с включёнными эффектами. Эффекты, зависящие от скорости, включаются сами.',
  'Load your characters in Builds to see their turns.':
    'Загрузите персонажей в «Билдах», чтобы увидеть их ходы.',
  'Warp forecast': 'Прогноз прыжков',
  'Genshin Impact · limited character banner': 'Genshin Impact · баннер лимитированного персонажа',
  'Pulls since last 5★': 'Круток после последнего 5★',
  'Next 5★ is guaranteed': 'Следующий 5★ гарантирован',
  'Pulls available': 'Доступно круток',
  Target: 'Цель',
  'Could not calculate: {reason}': 'Не удалось рассчитать: {reason}',
  'chance to reach your target': 'шанс получить цель',
  'Pulls needed': 'Сколько нужно круток',
  Pulls: 'Крутки',
  'Wish history': 'История молитв',
  'Genshin Impact · global servers · saved only on this device':
    'Genshin Impact · глобальные серверы · хранится только на этом устройстве',
  '{count} pulls since the last 5★': 'Молитв после последнего 5★: {count}',
  '{total} pulls in total · {count} since the last 4★':
    'Всего молитв: {total} · после последнего 4★: {count}',
  '5★ pulls, newest first': '5★, сначала новые',
  Name: 'Имя',
  Pity: 'Гарант',
  'On iPhone': 'На iPhone',
  // paimon.moe's own steps (MIT licence, credited in the README), its English and Russian.
  'Open Wish (in the game)': 'Откройте Молитвы (в игре)',
  'Press History': 'Нажмите кнопку История',
  'Wait for it to load': 'Подождите пока она загрузится',
  'Turn off your Wi-Fi and data connection': 'Выключите Wi-Fi и Сотовые данные',
  'Press refresh on top right corner': 'Нажмите обновить в правом верхнем углу',
  'The page should display an error and show you some text with a black font':
    'Страница должна выдать ошибку и показать текст с черным шрифтом',
  "Hold the text and press select all, then copy that text (don't copy only some portion of the text)":
    'Нажмите на текст и нажмите Выбрать все, затем скопируйте этот текст (скопируйте полностью!)',
  'Turn on your Wi-Fi or data connection': 'Включите Wi-Fi или Сотовые данные',
  'Paste the text to the textbox below': 'Вставьте текст ниже',
  'Open Paimon menu': 'Откройте главное меню',
  'Press Feedback': 'Нажмите Поддержка',
  'Wait for it to load and a feedback page should open':
    'Подождите пока загрузится информация о поддержке',
  'Press In-game issue': 'Нажмите Игра',
  'Press Co-Op Mode': 'Нажмите внизу Мультиплеер',
  'There is a link on the bottom of the reply; press that': 'Внизу будет ссылка, нажмите на нее',
  'A browser should open up. Copy the link and paste it below':
    'Должен открыться браузер. Скопируйте ссылку и вставьте ниже',
  'On Android': 'На Android',
  'No trustworthy source gives a way to get this link on Android or iPhone. A warp tracker on a PC can export the history to a UIGF or SRGF file, which this page reads below.':
    'Ни один надёжный источник не даёт способа получить эту ссылку на Android или iPhone. Трекер прыжков на ПК может выгрузить историю в файл UIGF или SRGF — эта страница читает его ниже.',
  'The link': 'Ссылка',
  'Where to get the history': 'Где взять историю',
  'Ask HoYoverse for your data': 'Запросить данные у HoYoverse',
  "HoYoverse's privacy policy says you may have the right to ask for a copy of the personal data it holds, by a verifiable request to its Data Protection Office at privacy@hoyoverse.com. It does not say whether the history of pulls is part of that data.":
    'В политике конфиденциальности HoYoverse сказано, что вы можете иметь право запросить копию ваших персональных данных, отправив подтверждаемый запрос в отдел защиты данных на privacy@hoyoverse.com. Входит ли в эти данные история круток, там не сказано.',
  'Source:': 'Источник:',
  'HoYoverse privacy policy': 'Политика конфиденциальности HoYoverse',
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
  'A relic cannot have the same substat twice.':
    'У реликвии не бывает двух одинаковых доп. статов.',
  'A substat cannot be the same as the main stat.': 'Доп. стат не может совпадать с главным.',
  'Enka.Network does not accept this UID.': 'Enka.Network не принимает этот UID.',
  'Enka.Network is not responding. Try again later.': 'Enka.Network не отвечает. Попробуйте позже.',
  'Enka.Network sent data this app cannot read.':
    'Enka.Network прислал данные, которые приложение не может прочитать.',
  'Enter the current value of the stat you set a goal for.':
    'Введите текущее значение стата, для которого задана цель.',
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
  'Share link': 'Поделиться ссылкой',
  'Link copied.': 'Ссылка скопирована.',
  Link: 'Ссылка',
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
export type Translate = (
  message: Message,
  values?: Readonly<Record<string, string | number>>,
) => string

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

export interface NumberFormat {
  readonly format: (value: number) => string
}

/** Like Intl.NumberFormat, in the language chosen when `format` is called: 1 825 000 in Russian. */
export function numberFormat(options: Intl.NumberFormatOptions = {}): NumberFormat {
  const formats = new Map<Language, Intl.NumberFormat>()
  return {
    format: (value) => {
      const format = formats.get(current) ?? new Intl.NumberFormat(current, options)
      formats.set(current, format)
      return format.format(value)
    },
  }
}

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

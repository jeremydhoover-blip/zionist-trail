/* eslint-disable no-use-before-define */
/* eslint-disable no-var */
// Constants.js - Zionist Trail Enhanced

var ZionistH = ZionistH || {};

// Game constants adapted for Zionist Trail
ZionistH.TOOL_DEGRADATION = 20;
ZionistH.GAME_SPEED = 1200; // Slower for more strategic gameplay
ZionistH.DAY_PER_STEP = 0.1; // Slower progression
ZionistH.FOOD_PER_PERSON = 0.15;
ZionistH.WATER_PER_PERSON = 0.1;
ZionistH.FULL_SPEED = 8;
ZionistH.SLOW_SPEED = 3;
ZionistH.FINAL_SETTLERS = 1000;
ZionistH.EVENT_PROBABILITY = 0.25; // More events for engagement
ZionistH.ENEMY_MEDICINE_AVG = 5;
ZionistH.ENEMY_RUBLES_AVG = 50;

// Travel pace constants
ZionistH.PACE_SLOW = 1;
ZionistH.PACE_NORMAL = 2;
ZionistH.PACE_FAST = 3;

// Health constants
ZionistH.HEALTH_EXCELLENT = 100;
ZionistH.HEALTH_GOOD = 75;
ZionistH.HEALTH_FAIR = 50;
ZionistH.HEALTH_POOR = 25;
ZionistH.HEALTH_CRITICAL = 10;

// Rations constants
ZionistH.RATIONS_BARE = 1;
ZionistH.RATIONS_MEAGER = 2;
ZionistH.RATIONS_FILLING = 3;

// Season constants
ZionistH.SEASON_SPRING = 0;
ZionistH.SEASON_SUMMER = 1;
ZionistH.SEASON_FALL = 2;
ZionistH.SEASON_AUTUMN = 2; // Alias for FALL
ZionistH.SEASON_WINTER = 3;

// Professions are defined in data/story-config.json (single source of truth)
// Journey locations are defined in data/story-config.json (single source of truth)

// Shared portrait lookup — used by Game.js, PartySelection.js, DailyDecision.js
ZionistH.getFamilyPortraitImage = function(memberName) {
  const familyPortraits = {
    'Hannah Rubinstein': 'images/grandmother.png',
    'Tzvika Rubinstein': 'images/grandfather.png',
    'Jeremy Hoover': 'images/father.png',
    'Tali Hoover': 'images/mother.png',
    'Iris Goldstein': 'images/iris.png',
    'Chaim Goldstein': 'images/chaim.png',
    'Mia Hoover': 'images/character-portraits-mia.png'
  };
  return familyPortraits[memberName] || null;
};

// Get portrait image for any party member — family name first, then profession fallback
ZionistH.getPortraitImage = function(member) {
  // Try family portrait by full name
  const familyImg = ZionistH.getFamilyPortraitImage(member.fullName || (member.firstName + ' ' + member.lastName));
  if (familyImg) return familyImg;

  // Profession-based portrait
  const professionPortraits = {
    'Carpenter': 'images/charcter-portraits-yaakov-the-builder.png',
    'Teacher': 'images/character-portraits-miriam-goldstein.png',
    'Farmer': 'images/charcter-portraits-avraham-farmer.png',
    'Nurse': 'images/character-portraits-sofie-stern.png',
    'Merchant': 'images/character-portraits-morechai-goldberg-merchant.png',
    'Scholar': 'images/character-portraits-miriam-goldstein.png'
  };
  return professionPortraits[member.profession] || 'images/charcter-portraits-rabbi-shmuel.png';
};

// Jewish pioneer names for party members
ZionistH.JEWISH_NAMES = {
  male: [
    "Avraham", "David", "Moshe", "Yaakov", "Yosef", "Shmuel", "Isaac", "Benjamin",
    "Aaron", "Menachem", "Chaim", "Mordechai", "Eliezer", "Shimon", "Reuven",
    "Asher", "Ephraim", "Naphtali", "Gad", "Dan", "Judah", "Levi", "Zalman",
    "Baruch", "Dov", "Tzvi", "Aryeh", "Uri", "Noam", "Eitan", "Yehuda"
  ],
  female: [
    "Sarah", "Rebecca", "Rachel", "Leah", "Miriam", "Esther", "Ruth", "Hannah",
    "Devorah", "Tamar", "Naomi", "Judith", "Shoshana", "Rivka", "Chaya",
    "Malka", "Bracha", "Tova", "Yael", "Dinah", "Batya", "Shifra", "Puah",
    "Avigail", "Michal", "Bathsheba", "Zippora", "Keturah", "Hagar", "Bilhah"
  ],
  surnames: [
    "Cohen", "Levy", "Goldberg", "Rosenberg", "Friedman", "Katz", "Rosen",
    "Weiss", "Schwartz", "Klein", "Stern", "Abramson", "Davidovich", "Moskowitz",
    "Bernstein", "Feldman", "Weinstein", "Goldstein", "Silverstein", "Rubenstein",
    "Horowitz", "Shapiro", "Kaplan", "Mandel", "Frankel", "Reichman", "Zuckerman"
  ]
};

// Building types moved to story-config.json

// Historical facts for loading screens
ZionistH.LOADING_FACTS = [
  "The First Aliyah (1882-1903) brought 25,000-35,000 Jews to Palestine",
  "Eliezer Ben-Yehuda revived Hebrew as a spoken language for daily use",
  "The BILU movement inspired young Russian Jews to immigrate to Palestine",
  "Baron Rothschild spent over 50 million francs supporting settlements",
  "Theodor Herzl published 'Der Judenstaat' (The Jewish State) in 1896",
  "The first Hebrew kindergarten opened in Rishon LeZion in 1898",
  "Petah Tikva was called 'Em HaMoshavot' (Mother of Settlements)",
  "Malaria was the #1 killer of early pioneers in Palestine",
  "The JNF was founded in 1901 to purchase land in Palestine",
  "Jaffa oranges became a famous export product of early settlements",
  "Hebrew newspapers were first published in Palestine in the 1860s",
  "The Bezalel Art School was founded in Jerusalem in 1906",
  "The Dreyfus Affair (1894) in France intensified Zionist sentiment across Europe",
  "Tel Aviv was founded in 1909 when 66 families drew lots for sandy plots north of Jaffa",
  "The First Zionist Congress was held in Basel, Switzerland in 1897",
  "Rishon LeZion means 'First in Zion' — it was founded in 1882",
  "Early settlers planted eucalyptus trees to drain malaria-infested swamps",
  "The Ottoman Land Law of 1858 made land purchases extremely difficult for Jews",
  "Many early pioneers worked in Rothschild's vineyards for meager wages",
  "The sea voyage from Trieste to Jaffa took 10-14 days by steamship",
  "Hebron's Jewish community is among the oldest in the world",
  "Rachel's Tomb near Bethlehem has been a pilgrimage site for millennia",
  "By the 1890s, Jews already comprised a majority of Jerusalem's population",
  "Arab farmers taught early Jewish settlers crucial irrigation techniques",
  "The blue and white of Israel's flag represents the Jewish prayer shawl (tallit)",
  "Rehovot was notable for insisting on self-reliance, refusing Rothschild patronage",
  "The Second Aliyah (1904-1914) brought idealistic socialists who founded the kibbutz movement",
  "Kraków's Kazimierz quarter was home to some of Europe's finest synagogues",
  "Vienna was both the capital of antisemitism and the birthplace of political Zionism",
  "The Circassians in Kfar Kama were settled by the Ottomans in 1878 from the Caucasus"
];

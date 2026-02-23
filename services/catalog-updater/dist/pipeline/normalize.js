"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedupe = exports.extractTagsFromDescription = exports.deriveFlavorProfiles = exports.normalizeTobaccoName = void 0;
const normalize = (value) => value.toLowerCase().trim();
const profileKeywords = {
    sweet: [
        'sweet',
        'dessert',
        'berry',
        'fruit',
        'candy',
        'ice cream',
        'melon',
        'watermelon',
        'mango',
        'pineapple',
        'passion',
        'pear',
        'apple',
        'grape',
        'cherry',
        'cola',
        'дыня',
        'арбуз',
        'манго',
        'ананас',
        'маракуй',
        'груша',
        'яблок',
        'виноград',
        'вишн',
        'черешн',
        'ягод',
        'малина',
        'брусника',
        'барбарис',
        'лимонад',
        'кола',
    ],
    sour: [
        'sour',
        'citrus',
        'lemon',
        'lime',
        'orange',
        'grapefruit',
        'bergamot',
        'кисл',
        'цитрус',
        'лимон',
        'лайм',
        'апельсин',
        'грейпфрут',
        'бергамот',
    ],
    spicy: ['spicy', 'spice', 'ginger', 'pepper', 'пряност', 'имбир'],
    fresh: ['fresh', 'mint', 'menthol', 'ice', 'cool', 'мят', 'ментол', 'лед', 'холод'],
    dessert: ['cream', 'milk', 'dessert', 'vanilla', 'coconut', 'сливк', 'молок', 'ваниль', 'кокос'],
    tobacco: ['tobacco', 'табак', 'cigar', 'сигар'],
};
const nameOverrides = {
    CACAO: 'Cacao',
    Cinnamon: 'Cinnamon Roll',
    'Earl Gray': 'Earl Grey',
    'Garnet Grape': 'Ruby Grape',
    'Must have Estragon': 'Estragon',
    Peppermint: 'Ice Mint',
    Rocket: 'Rocketman',
};
const normalizeTobaccoName = (name) => nameOverrides[name] ?? name;
exports.normalizeTobaccoName = normalizeTobaccoName;
const deriveFlavorProfiles = (tags) => {
    const normalizedTags = tags.map((tag) => normalize(tag));
    const matched = new Set();
    for (const [profile, keywords] of Object.entries(profileKeywords)) {
        for (const keyword of keywords) {
            if (normalizedTags.some((tag) => tag.includes(keyword))) {
                matched.add(profile);
                break;
            }
        }
    }
    return Array.from(matched);
};
exports.deriveFlavorProfiles = deriveFlavorProfiles;
const extractTagsFromDescription = (description) => {
    if (!description) {
        return [];
    }
    const matches = description.match(/#([\p{L}\p{N}_-]+)/gu) ?? [];
    return Array.from(new Set(matches
        .map((tag) => tag.slice(1).trim().toLowerCase())
        .filter((tag) => tag.length > 0)));
};
exports.extractTagsFromDescription = extractTagsFromDescription;
const dedupe = (items) => Array.from(new Set(items));
exports.dedupe = dedupe;

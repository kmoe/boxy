const INTEL_CODENAMES = [
  'allendale',
  'avoton',
  'bearlake',
  'bordenville',
  'broadwater',
  'broadwell',
  'burrage',
  'byfield',
  'carmack',
  'caswell',
  'cedarview',
  'claremont',
  'clarkdale',
  'clarksboro',
  'clarksfield',
  'clovertown',
  'cloverview',
  'conroe',
  'coppermine',
  'dandale',
  'denali',
  'dover',
  'elmcrest',
  'gardendale',
  'gasper',
  'glenwood',
  'haswell',
  'lakeport',
  'larrabee',
  'moorestown',
  'nehalem',
  'northwood',
  'penryn',
  'piketon',
  'pineview',
  'prescott',
  'ramsdale',
  'rockwell',
  'rosepoint',
  'siler',
  'silvermont',
  'skulltrail',
  'skylake',
  'skymont',
  'springdale',
  'windmill',
  'woodcrest',
  'yorkfield',
];

const MICROSOFT_CODENAMES = [
  'alder',
  'argo',
  'aspen',
  'astoria',
  'atlanta',
  'aurora',
  'bandit',
  'birch',
  'blackbird',
  'blackcomb',
  'blue',
  'bobcat',
  'bodie',
  'boston',
  'bullet',
  'cairo',
  'cedar',
  'centro',
  'chicago',
  'cider',
  'cougar',
  'crescent',
  'dallas',
  'darwin',
  'daytona',
  'deco',
  'denali',
  'detroit',
  'diamond',
  'dorado',
  'durango',
  'emerald',
  'everett',
  'fiji',
  'freestyle',
  'frosting',
  'geneva',
  'gryphon',
  'harmony',
  'hermes',
  'hydra',
  'impala',
  'indigo',
  'janus',
  'jupiter',
  'lonestar',
  'longhorn',
  'maestro',
  'mango',
  'mantis',
  'marvel',
  'memphis',
  'merlin',
  'metro',
  'mojave',
  'monaco',
  'monad',
  'nashville',
  'natal',
  'neptune',
  'odyssey',
  'pegasus',
  'phoenix',
  'quattro',
  'quebec',
  'rainier',
  'rapier',
  'rosario',
  'roslyn',
  'snowball',
  'sparta',
  'sphinx',
  'springboard',
  'stinger',
  'symphony',
  'tahoe',
  'talisker',
  'thunder',
  'tuscany',
  'vail',
  'vienna',
  'viper',
  'volta',
  'whistler',
  'wolfpack',
  'xenon',
  'yukon',
  'zurich',
];

const CAT_BREEDS = [
  'angora',
  'balinese',
  'bengal',
  'birman',
  'bobtail',
  'bombay',
  'burmese',
  'calico',
  'ginger',
  'himalayan',
  'javanese',
  'korat',
  'longhair',
  'marmalade',
  'oriental',
  'persian',
  'siamese',
  'siberian',
  'tabby',
  'tom',
];

function sanitiseString(str) {
  return str.replace(/[^a-z]/g, '');
}

function pickRandomWord(list) { // returns string
  return sanitiseString(list[Math.floor(Math.random() * list.length)]);
}

function pickRandomWords(list, numberOfRandomWords) { // returns array
  return
}

function generateRandomWords(numberOfRandomWords) {
  console.log('numberOfRandomWords', numberOfRandomWords);

  if (isNaN(parseInt(numberOfRandomWords, 10))) {
    return 'UNK';
  }

  switch (numberOfRandomWords) {
    case 0:
      return '';
    case 1:
      return pickRandomWord(CAT_BREEDS);
    case 2:
      return pickRandomWord(CAT_BREEDS) + '-' + pickRandomWord(INTEL_CODENAMES);
    default:
      return pickRandomWord(CAT_BREEDS) + '-' + pickRandomWord(INTEL_CODENAMES) + `-${pickRandomWord(MICROSOFT_CODENAMES)}`.repeat(numberOfRandomWords - 2);
  }
}

for (let i = 0; i < 5; i++) {
  console.log(generateRandomWords(i));
}

module.exports = generateRandomWords;

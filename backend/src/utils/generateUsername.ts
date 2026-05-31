import crypto from 'crypto';

const ADJECTIVES: string[] = [
  'Swift', 'Bright', 'Calm', 'Daring', 'Eager',
  'Fierce', 'Gentle', 'Happy', 'Keen', 'Lively',
  'Mighty', 'Noble', 'Quick', 'Radiant', 'Silent',
  'Brave', 'Clever', 'Witty', 'Bold', 'Curious',
  'Agile', 'Cosmic', 'Dreamy', 'Electric', 'Frozen',
  'Golden', 'Hidden', 'Iron', 'Jade', 'Kindred',
  'Lunar', 'Mystic', 'Nimble', 'Obsidian', 'Primal',
  'Quantum', 'Rustic', 'Stellar', 'Tidal', 'Urban',
  'Vivid', 'Wild', 'Zealous', 'Ancient', 'Blazing',
  'Crystal', 'Digital', 'Emerald', 'Frosty', 'Glowing',
  'Hollow', 'Infinite', 'Jolly', 'Kinetic',
];

const NOUNS: string[] = [
  'Phoenix', 'Wolf', 'Eagle', 'Tiger', 'Falcon',
  'Dragon', 'Panther', 'Hawk', 'Bear', 'Fox',
  'Raven', 'Shark', 'Cobra', 'Lynx', 'Otter',
  'Panda', 'Owl', 'Dolphin', 'Jaguar', 'Viper',
  'Coyote', 'Crane', 'Badger', 'Bison', 'Condor',
  'Dingo', 'Elk', 'Ferret', 'Gecko', 'Heron',
  'Ibis', 'Jackal', 'Koala', 'Lemur', 'Moose',
  'Newt', 'Osprey', 'Puma', 'Quail', 'Robin',
  'Stork', 'Toucan', 'Urchin', 'Vulture', 'Wombat',
  'Yak', 'Zebra', 'Mantis', 'Sparrow', 'Stallion',
  'Serpent', 'Marlin', 'Pelican',
];

/**
 * Generates an anonymous username in the format [Adjective][Noun]_[3-digit number].
 * Checks uniqueness via the provided callback. Retries up to 10 times.
 *
 * @param checkExists - Callback that returns true if the username already exists
 * @returns A unique anonymous username
 * @throws Error if a unique username cannot be generated after 10 retries
 */
export async function generateUsername(
  checkExists: (username: string) => Promise<boolean>
): Promise<string> {
  const maxRetries = 10;

  for (let i = 0; i < maxRetries; i++) {
    const adjective = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
    const noun = NOUNS[crypto.randomInt(NOUNS.length)];
    const number = String(crypto.randomInt(1000)).padStart(3, '0');
    const username = `${adjective}${noun}_${number}`;

    const exists = await checkExists(username);
    if (!exists) {
      return username;
    }
  }

  throw new Error('Username generation failed after maximum retries');
}

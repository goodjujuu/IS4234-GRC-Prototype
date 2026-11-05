const { randomBytes, scryptSync, timingSafeEqual } = require('crypto');

// CommonJS so prisma/seed.js can create the demo logins.
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  return timingSafeEqual(scryptSync(password, salt, expected.length), expected);
}

module.exports = { hashPassword, verifyPassword };

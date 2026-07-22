import jwt from 'jsonwebtoken';

const defaultSecret = 'paperflow-dev-secret-change-me';

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || defaultSecret, {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || defaultSecret);
}

import { z } from 'zod';

const loginRegex = /^[a-zA-Z0-9_]{3,24}$/;
const nicknameRegex = /^[a-zA-Z0-9 _-]{3,24}$/;

export const registrationSchema = z.object({
  email: z.string().trim().email().max(120),
  login: z.string().trim().min(3).max(24).regex(loginRegex, 'Login must be 3-24 characters and use only letters, numbers, or underscores.'),
  password: z.string().min(8).max(72),
  nickname: z.string().trim().min(3).max(24).regex(nicknameRegex, 'Nickname must be 3-24 characters long.'),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
  password: z.string().min(8).max(72),
});

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'url';

// Файл может быть как в src/init-config.ts, так и в dist/src/init-config.js.
// Поднимаемся на два уровня вверх от текущего файла: <root>/src/init-config.ts или <root>/dist/src/init-config.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// projectRoot = <root>
export const projectRoot = path.resolve(__dirname, '..', '..');

// Явно указываем путь к корневому .env
export const dotenvConfigResult = dotenv.config({
  path: path.join(projectRoot, '.env'),
  debug: false,
  quiet: true,
  override: false,
});


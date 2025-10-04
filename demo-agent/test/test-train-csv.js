#!/usr/bin/env node
/**
 * Тестирование demo-agent на данных train.csv
 *
 * Задача:
 * 1. Подаёт вопросы из train.csv в demo-agent
 * 2. Включает SHOW_MCP_ENDPOINTS=true
 * 3. Проверяет, что возвращённые endpoints совпадают с ожидаемыми
 * 4. Генерирует метрику accuracy
 * 5. Выводит результаты в консоль
 * 6. Генерит wrong_requests.json с информацией по непройденным запросам
 *
 * Использование:
 *   node demo-agent/test/test-train-csv.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Конфигурация
const DEMO_AGENT_URL = process.env.DEMO_AGENT_URL || 'http://localhost:3002';
const TRAIN_CSV_PATH = join(__dirname, 'data', 'train.csv');
const WRONG_REQUESTS_PATH = join(__dirname, 'wrong_requests.json');

/**
 * Загрузить train.csv
 */
function loadTrainCsv() {
  const content = readFileSync(TRAIN_CSV_PATH, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0].split(';');

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {
      uid: values[0],
      type: values[1],
      question: values[2],
      request: values[3],
    };
    data.push(row);
  }

  return data;
}

/**
 * Создать сессию в demo-agent
 */
async function createSession() {
  const response = await axios.post(`${DEMO_AGENT_URL}/api/sessions`, {
    userId: 'test-user',
  });
  return response.data.sessionId;
}

/**
 * Отправить сообщение в demo-agent
 */
async function sendMessage(sessionId, message, accountId = null) {
  const payload = {
    sessionId,
    message,
  };

  if (accountId) {
    payload.accountId = accountId;
  }

  const response = await axios.post(`${DEMO_AGENT_URL}/api/chat`, payload);
  return response.data;
}

/**
 * Извлечь account_id из request, если есть
 */
function extractAccountId(request) {
  // Паттерны: /v1/accounts/{account_id}/... или ?account_id=...
  const pathMatch = request.match(/\/accounts\/([^\/\?]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  const queryMatch = request.match(/[?&]account_id=([^&]+)/);
  if (queryMatch) {
    return queryMatch[1];
  }

  return null;
}

/**
 * Извлечь endpoints из toolCalls
 */
function extractEndpoints(toolCalls) {
  if (!toolCalls || !Array.isArray(toolCalls)) {
    return [];
  }

  const endpoints = [];
  for (const toolCall of toolCalls) {
    // Ищем endpoints в metadata или других полях
    if (toolCall.endpoints && Array.isArray(toolCall.endpoints)) {
      endpoints.push(...toolCall.endpoints);
    }
    // Альтернативно: если endpoints в result
    if (toolCall.result && toolCall.result.endpoints) {
      endpoints.push(...toolCall.result.endpoints);
    }
  }

  return endpoints;
}

/**
 * Нормализовать endpoint для сравнения
 * Заменяет конкретные значения на плейсхолдеры
 */
function normalizeEndpoint(endpoint, accountId = null) {
  let normalized = endpoint;

  // Заменяем конкретный account_id на {account_id}
  if (accountId) {
    normalized = normalized.replace(accountId, '{account_id}');
  } else {
    // Пробуем найти и заменить любой account_id в пути
    normalized = normalized.replace(/\/accounts\/[^\/\?]+/, '/accounts/{account_id}');
    normalized = normalized.replace(/account_id=[^&]+/, 'account_id={account_id}');
  }

  // Заменяем конкретные order_id на {order_id}
  normalized = normalized.replace(/\/orders\/[A-Z0-9]+/, '/orders/{order_id}');

  // Убираем timestamp параметры для упрощения
  // (в зависимости от требований можно оставить)

  return normalized;
}

/**
 * Проверить совпадение request с endpoints
 */
function matchRequest(expectedType, expectedRequest, toolCalls) {
  const endpoints = extractEndpoints(toolCalls);

  if (endpoints.length === 0) {
    return { match: false, reason: 'No endpoints found in toolCalls' };
  }

  // Извлекаем account_id из ожидаемого запроса
  const accountId = extractAccountId(expectedRequest);

  // Нормализуем ожидаемый request
  const normalizedExpected = normalizeEndpoint(expectedRequest, accountId);

  // Проверяем каждый endpoint
  for (const endpoint of endpoints) {
    const normalizedEndpoint = normalizeEndpoint(endpoint, accountId);

    if (normalizedEndpoint === normalizedExpected) {
      return { match: true, matchedEndpoint: endpoint };
    }
  }

  return {
    match: false,
    reason: `Expected: ${normalizedExpected}, Got: ${endpoints.join(', ')}`,
  };
}

/**
 * Главная функция тестирования
 */
async function runTests() {
  console.log('🧪 Запуск тестирования demo-agent на train.csv...\n');

  // Проверка доступности demo-agent
  try {
    const healthCheck = await axios.get(`${DEMO_AGENT_URL}/api/health`);
    if (healthCheck.data.status !== 'ok') {
      throw new Error('Demo-agent не готов');
    }
    console.log('✅ Demo-agent доступен\n');
  } catch (error) {
    console.error('❌ Ошибка: Demo-agent недоступен');
    console.error(`   Убедитесь, что demo-agent запущен на ${DEMO_AGENT_URL}`);
    console.error(`   Запустите: cd demo-agent && npm run dev`);
    process.exit(1);
  }

  // Загрузка данных
  console.log('📂 Загрузка train.csv...');
  const trainData = loadTrainCsv();
  console.log(`   Загружено ${trainData.length} записей\n`);

  // Создание сессии
  console.log('🔧 Создание сессии...');
  const sessionId = await createSession();
  console.log(`   Session ID: ${sessionId}\n`);

  // Статистика
  let total = 0;
  let correct = 0;
  const wrongRequests = [];

  console.log('🚀 Начало тестирования...\n');
  console.log('═'.repeat(80));

  // Обработка каждого запроса
  for (const row of trainData) {
    total++;
    const { uid, type, question, request } = row;

    console.log(`\n[${total}/${trainData.length}] UID: ${uid}`);
    console.log(`Question: ${question}`);
    console.log(`Expected: ${type} ${request}`);

    try {
      // Извлекаем account_id если есть
      const accountId = extractAccountId(request);

      // Отправляем вопрос в demo-agent
      const response = await sendMessage(sessionId, question, accountId);

      // Проверяем совпадение
      const matchResult = matchRequest(type, request, response.toolCalls);

      if (matchResult.match) {
        console.log(`✅ PASS`);
        correct++;
      } else {
        console.log(`❌ FAIL: ${matchResult.reason}`);
        wrongRequests.push({
          uid,
          type,
          question,
          expected_request: request,
          actual_endpoints: extractEndpoints(response.toolCalls),
          reason: matchResult.reason,
          agent_response: response.message,
        });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      wrongRequests.push({
        uid,
        type,
        question,
        expected_request: request,
        error: error.message,
      });
    }

    // Небольшая задержка между запросами
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n' + '═'.repeat(80));

  // Подсчёт accuracy
  const accuracy = ((correct / total) * 100).toFixed(2);

  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log('═'.repeat(80));
  console.log(`Всего запросов:       ${total}`);
  console.log(`Пройдено:             ${correct}`);
  console.log(`Провалено:            ${total - correct}`);
  console.log(`Accuracy:             ${accuracy}%`);
  console.log('═'.repeat(80));

  // Сохранение ошибок
  if (wrongRequests.length > 0) {
    writeFileSync(WRONG_REQUESTS_PATH, JSON.stringify(wrongRequests, null, 2), 'utf-8');
    console.log(`\n💾 Ошибки сохранены в: ${WRONG_REQUESTS_PATH}`);
    console.log(`   Количество ошибок: ${wrongRequests.length}`);
  } else {
    console.log('\n🎉 Все тесты пройдены успешно!');
  }

  console.log('\n');
}

// Запуск
runTests().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

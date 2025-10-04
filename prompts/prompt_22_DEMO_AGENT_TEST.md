Тезисы:
- есть тестовые данные demo-agent/test/data/train.csv
- необходимо сделать так, чтобы возвращалась информаиця какой был возвращен эндпоинт
# Задача
Написать тестирование demo-agent/test/data/train.csv данных используя demo-agent
# Решение
Система:
1. Подаёт вопросы из train.csv в demo-agent
2. Включает SHOW_MCP_ENDPOINTS=true
3. Проверяет, что возвращённые endpoints совпадают с ожидаемыми в датасете
4. Генерирует метрику accuracy (только)
5. Выводит результаты в консоль
6. Генерит wrong_requests.JSON в папке demo-agent/test, где есть информация по непройденному запросу
[prompt_20_DEMO_AGENT_TRADING.md](prompt_20_DEMO_AGENT_TRADING.md)
# Цель
Описать схемы данных всех эндпоинтов на typescript

# Для чего
Чтобы правильно реализовать MCP tool-ы, точно зная типы данных всех свойств.

## Источники сведений
_fta/proto/accounts_service.proto
_fta/proto/assets_service.proto
_fta/proto/auth_service.proto
_fta/proto/marketdata_service.proto
_fta/proto/orders_service.proto
_fta/proto/side.proto
_fta/proto/trade.proto

_fta/api-doc-pages.md

_fta/api-registry-example.js
_fta/descriptions.js

_fta/REST API.postman_collection.json


# Задача
Наполни файл src/meta/finam-trade-api-interfaces.d.ts описаниями всех входящих и выходящих типов данных для всех эндпоинтов.

# Указания
Если у эндпоинта нет входящей структуры (н-р для методов GET) то тогда и не должно быть никакого типа данных для входящих структур.

Читай страницы с описаниями эндпоинтов приведенные в файле _fta/api-doc-pages.md
Делай это с помощью MCP playwright
Страницу эндпоинта можно найти по последнему сегменту пути, равному имени эндпоинта.
Также читай родительскую страницу.
Например, для эндпоинта GetAccount надо будет прочитать 2 страницы:
https://tradeapi.finam.ru/docs/guides/rest/accounts_service/
https://tradeapi.finam.ru/docs/guides/rest/accounts_service/GetAccount

На HTML страницах ищи комментарии и описание ко вхоодным и выходным параметрам.
Добавляй эти комментари в описания типов и интерфейсов.


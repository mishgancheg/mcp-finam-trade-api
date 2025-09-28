# Цель
Получить и зафиксировать в файле src/meta/finam-trade-api-registry.js
полные сведения обо всех эндпоинтах FINAM Trade API

# Источник информации

_fta/proto/accounts_service.proto
_fta/proto/assets_service.proto
_fta/proto/auth_service.proto
_fta/proto/marketdata_service.proto
_fta/proto/orders_service.proto
_fta/proto/side.proto
_fta/proto/trade.proto

_fta/api-doc-pages.md - список ссылок на страницы эндпоинтов, которые надо открывать с помощью MCP playwright

_fta/api-registry-example.js
_fta/descriptions.js

_fta/REST API.postman_collection.json


# Задача
1) Изучи источники. 
   Собери информацию об эндпоинтах API и примерах входных и выходных данных.
   Примеры `выходных данных` бери со страниц с описаниями эндпоинтов приведенные в файле _fta/api-doc-pages.md
   Делай это с помощью MCP playwright
   Страницу эндпоинта можно найти по последнему сегменту пути, равному имени эндпоинта.
   Например, для эндпоинта GetAccount надо будет прочитать:
   https://tradeapi.finam.ru/docs/guides/rest/accounts_service/GetAccount


2) Создай массив сведений для каждого эндпоинта в файле src/meta/finam-trade-api-registry.js
   по примеру из файла _fta/api-registry-example.js

   Используй добавление геттеров свойств как в примере src/meta/finam-trade-api-registry.js
   
   Набор эндпоинтов смотри в _fta/REST API.postman_collection.json
   В поле `group` помещай значение `item.name` первого уровна
   В поле `name` помещай значение `item.name` второго уровня
   В поле `sourceUri` добавляй соответствующую ссылку на эндпоинт.


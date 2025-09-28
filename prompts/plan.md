Subject: [PATCH] План
---
Index: prompts/plan.md
IDEA additional info:
Subsystem: com.intellij.openapi.diff.impl.patch.CharsetEP
<+>UTF-8
===================================================================
diff --git a/prompts/plan.md b/prompts/plan.md
--- a/prompts/plan.md	(revision f589879a9e934deb4fc4cd2e1f5c16ea930035b9)
+++ b/prompts/plan.md	(revision 292448e22f7395251552763ad38aa3f0274e13bd)
@@ -47,8 +47,29 @@
5) Написать библиотеку функциий, которые являются обертками для всех эндпоинтов API
    - функции должны быть бесшовно используемы как MCP тулы в дальнейшем.
    - они должны получать объект с параметрами (чтобы нативно вызываться из соответствующих MCP инструментов)
-   - они должны возвращать строку. Продумай, как лучше представить ответы в виде
-     строк, чтобы они удобно воспринимались LLM для использования в агенткой системе
+   - они должны возвращать ответ в стандартном виде или выбрасывать исключение в случае ошибки
      +```javascript
      +server.setRequestHandler(CallToolRequestSchema, async (request) => {
+  try {
+    const result = await someOperation();
+
+    return {
+      content: [
+        {
+          type: 'text',
+          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
+        }
+      ],
+    };
+  } catch (error) {
+    throw new McpError(
+      ErrorCode.InternalError,
+      error instanceof Error ? error.message : String(error)
+    );
+  }
   +});
   +```
+
    - Все функции будут вызывать FINAM Trade API. Поэтому все они должны получать параметр secret_token.

6) Написать MCP-сервер с обертками - тулами для всех эндпоинтов API

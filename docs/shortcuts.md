---
# Integração com Apple Shortcuts

Este documento explica como usar os endpoints `shortcuts` para criar despesas e rendas a partir do app Apple Shortcuts (ou qualquer automação externa).

## Endpoints

- `GET /api/shortcuts/expenses` — retorna dados para preencher selects do quick-add: `{ categories, wallets, tags }`.
- `POST /api/shortcuts/expenses` — cria uma despesa. Aceita os mesmos campos do quick-add web.
- `GET /api/shortcuts/incomes` — retorna dados para selects do quick-add de rendas.
- `POST /api/shortcuts/incomes` — cria uma renda.

## Autenticação

Esses endpoints aceitam duas formas de autenticação:

- Sessão (NextAuth): quando a requisição carrega o cookie de sessão (ex.: navegador).
- Chave por usuário (recomendada para Shortcuts): enviar o header HTTP `Authorization: Bearer <API_KEY>` onde `<API_KEY>` é a chave exibida no perfil do usuário.

Recomendação de segurança: prefira chaves por usuário em vez de um secret compartilhado. As chaves são armazenadas em `User.apiKey` e podem ser regeneradas ou revogadas pelo usuário.

## Campos aceitos (POST)

Campos comuns para despesas e rendas:

- `description` (string) — obrigatório
- `amount` (number) — obrigatório, positivo
- `date` (string) — opcional; formatos aceitos: `YYYY-MM-DD`, `DD/MM/YYYY` ou ISO; padrão: hoje
- `type` (string) — `FIXED` ou `VARIABLE`
- `isFixed` (boolean) — opcional
- `startDate`, `endDate` (string|null) — opcionais para registros fixos
- `dayOfMonth` (number|null) — opcional para fixas
- `categoryId` (string|null) — opcional (use o id vindo do GET)
- `walletId` (string|null) — opcional (use o id vindo do GET)
- `tags` (string[]) — opcional; array de nomes de tag

## Exemplos (curl / PowerShell)

Obter selects para despesas (quando autenticado com sessão):

```powershell
curl "http://localhost:3000/api/shortcuts/expenses"
```

Criar despesa com `Authorization: Bearer <API_KEY>`:

```powershell
curl -X POST "http://localhost:3000/api/shortcuts/expenses" -H "Content-Type: application/json" -H "Authorization: Bearer <API_KEY>" -d '{"description":"Café","amount":4.5,"date":"2025-09-17","type":"VARIABLE"}'
```

Criar renda:

```powershell
curl -X POST "http://localhost:3000/api/shortcuts/incomes" -H "Content-Type: application/json" -H "Authorization: Bearer <API_KEY>" -d '{"description":"Freelance","amount":1200,"date":"2025-09-15","type":"VARIABLE"}'
```

## Apple Shortcuts — passo a passo

1. Abra o app Shortcuts e crie um novo Shortcut.
2. Adicione a ação `Get Contents of URL`.
3. Configure o método como `POST`.
4. Em `Headers` adicione:
   - `Content-Type: application/json`
   - `Authorization: Bearer <API_KEY>` (substitua `<API_KEY>` pela chave do usuário)
5. Em `Request Body` escolha `JSON` e construa o objeto com as propriedades desejadas (ex.: descrição, amount, date, type).
6. Execute o Shortcut — você pode usar a resposta JSON em ações seguintes (ex.: mostrar notificação).

## Importável — Exemplo JSON do Shortcut (didático)

O JSON abaixo é um exemplo didático que mostra a ação e headers. A importação direta pode variar por versão do Shortcuts/iOS.

```json
{
  "name": "Adicionar gasto - Financeiro",
  "actions": [
    {
      "type": "URL",
      "properties": { "url": "https://your-site.example.com/api/shortcuts/expenses" }
    },
    {
      "type": "GetContentsOfURL",
      "properties": {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json",
          "Authorization": "Bearer <API_KEY>"
        },
        "requestBody": { "description": "Café", "amount": 4.5, "date": "2025-09-17", "type": "VARIABLE" }
      }
    }
  ]
}
```

## Dicas e casos de borda

- Se muitos clientes externos vão acessar a API, considere políticas de rotação e limites por chave.
- Valide `amount` e `date` também no cliente quando possível.
- Registre e monitore o uso das chaves para detectar abuso.

---# Apple Shortcuts integration

This document explains the small HTTP API to create expenses and incomes using Apple Shortcuts (or any external automation).

Endpoints

- `GET /api/shortcuts/expenses` — returns select data for quick-add: `{ categories, wallets, tags }`.
- `POST /api/shortcuts/expenses` — create an expense. Accepts the same fields as the web quick-add.
- `GET /api/shortcuts/incomes` — returns select data for quick-add: `{ categories, wallets, tags }`.
- `POST /api/shortcuts/incomes` — create an income.

Authentication

These endpoints require a valid NextAuth session. The server uses the session to identify the user. If you need to call the API from an external automation (Apple Shortcuts running on a different device), consider implementing a per-user API key flow so the external client can authenticate without simulating the NextAuth cookie/session.

Security note: prefer per-user API keys over a shared secret for production usage. The repository doesn't create API keys by default — I can add that flow if you want.

Request fields (POST)

Common fields for both expenses and incomes:

- `description` (string) — required
- `amount` (number) — required, positive
- `date` (string) — optional; supported formats: `YYYY-MM-DD`, `DD/MM/YYYY`, or full ISO string; defaults to today if omitted
- `type` (string) — either `FIXED` or `VARIABLE`
- `isFixed` (boolean) — optional
- `startDate`, `endDate` (string|null) — optional for fixed records
- `dayOfMonth` (number|null) — optional for fixed records
- `categoryId` (string|null) — optional (use the id returned from GET)
- `walletId` (string|null) — optional (use the id returned from GET)
- `tags` (string[]) — optional; array of tag names
- `email` (string) — optional when using secret mode; required for secret mode

Examples (curl / PowerShell)

GET selects for expenses (example when you have a browser session):

```powershell
# If you have an authenticated session in the browser, you can call the GET from the browser context or use a tool that sends the NextAuth cookie.
curl "http://localhost:3000/api/shortcuts/expenses"
```

Create an expense (from a browser session or client that carries the NextAuth cookie):

```powershell
curl -X POST "http://localhost:3000/api/shortcuts/expenses" -H "Content-Type: application/json" -d '{"description":"Coffee","amount":4.5,"date":"2025-09-17","type":"VARIABLE"}'
```

Create an income:

```powershell
curl -X POST "http://localhost:3000/api/shortcuts/incomes" -H "Content-Type: application/json" -d '{"description":"Freelance","amount":1200,"date":"2025-09-15","type":"VARIABLE"}'
```

Apple Shortcuts

Use the built-in `Get Contents of URL` action. Set method to `POST`, header `Content-Type: application/json` and `x-shortcuts-secret` with the secret value. Put the body as JSON (can be created from Shortcut variables).

Edge cases & recommendations

- If you expect many external clients, consider issuing per-user API tokens instead of a single shared secret.
- Validate amounts and dates on client side too.
- Rate-limit or monitor usage of these endpoints if they will be public.

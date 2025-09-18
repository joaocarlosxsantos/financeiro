# Seeds de Teste

Este diretório contém um script para gerar dados de teste (carteiras, categorias, tags, transações fixas e variáveis para 3 meses, e módulo de controle de contas).

Arquivos gerados (em `output/`):
- `user.json`
- `wallets.json`
- `categories.json`
- `tags.json`
- `recurring.json`
- `transactions.json`
- `groups.json`
- `members.json`
- `accounts.json`

Como gerar:

No Windows PowerShell, a partir da raiz do projeto (`D:\financeiro`):

```powershell
python .\seeds\generate_test_data.py
```

Como importar (opções):

1) Importar manualmente para banco (exemplo Postgres/SQLite):
- Abra o `transactions.json` e adapte os campos para sua tabela.
- Use um script Python/Node para ler o JSON e inserir via ORM (Prisma/Sequelize/psycopg2).

Exemplo rápido em Python com sqlite3:

```python
import json, sqlite3
con = sqlite3.connect('db.sqlite3')
cur = con.cursor()
with open('seeds/output/transactions.json', 'r', encoding='utf-8') as f:
    txs = json.load(f)
for tx in txs:
    cur.execute("INSERT INTO transactions (id, user_id, date, description, amount, category_id, wallet_id) VALUES (?,?,?,?,?,?,?)",
                (tx['id'], tx['user_id'], tx['date'], tx['description'], tx['amount'], tx.get('category_id'), tx.get('wallet_id')))
con.commit()
```

2) Usar endpoints da API do projeto (se existentes):
- Você pode criar um pequeno script que leia os JSONs e chame os endpoints (ex.: POST `/api/wallets`, `/api/transactions`, etc.) utilizando `requests` e um `apikey` de teste.

Observações:
- O script gera transações para 3 meses (Jun-Ago 2025) incluindo tanto recorrentes quanto variáveis.
- Ajuste os valores iniciais, médias e quantidades no arquivo `generate_test_data.py` conforme necessário.

Se quiser, posso também gerar:
- Um script de import completo usando Prisma/Node (TypeScript) ou Python para o seu banco atual.
- Endpoints de import na API.

import json
import os
from datetime import date, timedelta
import random
import uuid

OUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUT_DIR, exist_ok=True)

# Config do usuário (fornecido)
USER = {
    "id": "test-user-001",
    "name": "Usuário Teste",
    "email": "teste@teste.com",
    "currency": "BRL",
    "timezone": "America/Sao_Paulo",
    "start_date": "2025-06-01"
}

# Carteiras (com saldos iniciais fornecidos)
WALLETS = [
    {"id": "w-inter", "name": "Inter", "type": "checking", "balance": 500.00, "currency": USER["currency"]},
    {"id": "w-nubank", "name": "Nubank", "type": "checking", "balance": 1000.00, "currency": USER["currency"]},
    {"id": "w-sodexo", "name": "Sodexo (Benefícios)", "type": "benefits", "balance": 300.00, "currency": USER["currency"]}
]

# Categorias (exemplos)
CATEGORIES = [
    {"id": "c-salary", "name": "Salário", "type": "income"},
    {"id": "c-freelance", "name": "Freelance", "type": "income"},
    {"id": "c-rent", "name": "Aluguel", "type": "expense"},
    {"id": "c-grocery", "name": "Supermercado", "type": "expense"},
    {"id": "c-transport", "name": "Transporte", "type": "expense"},
    {"id": "c-leisure", "name": "Lazer", "type": "expense"},
    {"id": "c-subscriptions", "name": "Assinaturas", "type": "expense"},
    {"id": "c-investments", "name": "Investimentos", "type": "expense"}
]

# Tags
TAGS = [
    {"id": "t-family", "name": "familia"},
    {"id": "t-home", "name": "moradia"},
    {"id": "t-work", "name": "trabalho"},
    {"id": "t-health", "name": "saude"},
    {"id": "t-travel", "name": "viagem"},
    {"id": "t-card", "name": "cartao"},
    {"id": "t-food", "name": "food"},
    {"id": "t-fun", "name": "recreacao"}
]

# Recorrentes fixos (mensais)
RECURRING = [
    {"id": "r-salary", "name": "Salário Mensal", "category_id": "c-salary", "amount": 7000.00, "wallet_id": "w-inter", "frequency": "monthly", "day": 5, "type": "income"},
    {"id": "r-rent", "name": "Aluguel", "category_id": "c-rent", "amount": -1800.00, "wallet_id": "w-inter", "frequency": "monthly", "day": 2, "type": "expense"},
    {"id": "r-spotify", "name": "Spotify/Streaming", "category_id": "c-subscriptions", "amount": -29.90, "wallet_id": "w-inter", "frequency": "monthly", "day": 10, "type": "expense"},
    {"id": "r-invest", "name": "Investimento Automático", "category_id": "c-investments", "amount": -500.00, "wallet_id": "w-nubank", "frequency": "monthly", "day": 15, "type": "expense"}
]

# Gerar transações variáveis e aplicar recorrentes para 3 meses (jun, jul, ago 2025)

def daterange(start_date, end_date):
    for n in range(int((end_date - start_date).days) + 1):
        yield start_date + timedelta(n)

random.seed(42)

start = date(2025, 6, 1)
end = date(2025, 8, 31)

transactions = []

# Aplicar recorrentes (3 meses)
for rec in RECURRING:
    for month in range(6, 9):
        try:
            day = rec["day"]
            d = date(2025, month, day)
        except Exception:
            last_day = (date(2025, month + 1, 1) - timedelta(days=1)) if month < 12 else date(2025, 12, 31)
            d = last_day
        transactions.append({
            "id": str(uuid.uuid4()),
            "user_id": USER["id"],
            "date": d.isoformat(),
            "description": rec["name"],
            "amount": rec["amount"],
            "category_id": rec["category_id"],
            "wallet_id": rec["wallet_id"],
            "tags": [],
            "recurring_id": rec["id"]
        })

# Gerar variáveis — padrões por categoria
variable_patterns = [
    {"category_id": "c-grocery", "mean": 120.0, "wallets": ["w-inter"], "tags": ["food", "familia"]},
    {"category_id": "c-transport", "mean": 25.0, "wallets": ["w-inter"], "tags": ["transporte"]},
    {"category_id": "c-leisure", "mean": 60.0, "wallets": ["w-inter", "w-nubank"], "tags": ["recreacao"]},
    {"category_id": "c-freelance", "mean": 800.0, "wallets": ["w-inter"], "tags": ["trabalho"]}
]

for single_date in daterange(start, end):
    # a cada dia, gerar de 0 a 3 transações variáveis
    for _ in range(random.choices([0,1,2,3], weights=[40,35,20,5])[0]):
        pattern = random.choice(variable_patterns)
        amt = round(random.gauss(pattern["mean"], pattern["mean"]*0.3), 2)
        # para despesas tornar negativo (exceto freelance)
        if pattern["category_id"] != "c-freelance":
            amt = -abs(amt)
        wallet = random.choice(pattern["wallets"])
        tx = {
            "id": str(uuid.uuid4()),
            "user_id": USER["id"],
            "date": single_date.isoformat(),
            "description": f"{'Recebimento' if amt>0 else 'Pagamento'} - {pattern['category_id']}",
            "amount": amt,
            "category_id": pattern["category_id"],
            "wallet_id": wallet,
            "tags": random.sample([t["name"] for t in TAGS], k=random.randint(0,2))
        }
        transactions.append(tx)

# Módulo de controle de contas (grupos, membros, contas)
GROUPS = []
MEMBERS = []
ACCOUNTS = []

for i in range(1,6):  # 5 grupos
    gid = f"group-{i:02d}"
    group = {"id": gid, "name": f"Grupo {i}", "description": f"Grupo de exemplo {i}"}
    GROUPS.append(group)
    # 2 a 4 membros por grupo
    for m in range(random.randint(2,4)):
        mid = str(uuid.uuid4())
        member = {"id": mid, "group_id": gid, "name": f"Membro {i}-{m+1}", "email": f"m{i}{m+1}@exemplo.com"}
        MEMBERS.append(member)
    # criar 1-2 contas por grupo
    for a in range(random.randint(1,2)):
        aid = str(uuid.uuid4())
        bal = round(random.uniform(100.0, 5000.0),2)
        acc = {"id": aid, "group_id": gid, "name": f"Conta {i}-{a+1}", "type": random.choice(["checking","savings","investment"]), "balance": bal, "currency": USER["currency"]}
        ACCOUNTS.append(acc)

# Escrever arquivos
with open(os.path.join(OUT_DIR, "user.json"), "w", encoding="utf-8") as f:
    json.dump(USER, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, "wallets.json"), "w", encoding="utf-8") as f:
    json.dump(WALLETS, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, "categories.json"), "w", encoding="utf-8") as f:
    json.dump(CATEGORIES, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, "tags.json"), "w", encoding="utf-8") as f:
    json.dump(TAGS, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, "recurring.json"), "w", encoding="utf-8") as f:
    json.dump(RECURRING, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, "transactions.json"), "w", encoding="utf-8") as f:
    json.dump(transactions, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, "groups.json"), "w", encoding="utf-8") as f:
    json.dump(GROUPS, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, "members.json"), "w", encoding="utf-8") as f:
    json.dump(MEMBERS, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, "accounts.json"), "w", encoding="utf-8") as f:
    json.dump(ACCOUNTS, f, ensure_ascii=False, indent=2)

print(f"Seeds geradas em: {OUT_DIR}")
print(f"Transações geradas: {len(transactions)}")

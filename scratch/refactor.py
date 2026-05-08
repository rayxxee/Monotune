import re

with open('backend/server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Routes to refactor: /api/discover, /api/discover/encores/remaining, /api/discover/swipe, /api/blocks, etc.
# Find all occurrences of:
# app.METHOD('PATH', async (req, res) => {
#   const authHeader = req.headers.authorization;
#   if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
#   try {
#     const token = authHeader.split(' ')[1];
#     const decoded = jwt.verify(token, JWT_SECRET) as any;

pattern = re.compile(
    r"(app\.(?:get|post|patch|delete)\('([^']+)',\s*)async\s*\(req,\s*res\)\s*=>\s*\{\s*"
    r"const\s+authHeader\s*=\s*req\.headers\.authorization;\s*"
    r"if\s*\(!authHeader\)\s*return\s*res\.status\(401\)\.json\(\{.*?\}\);\s*"
    r"try\s*\{\s*"
    r"const\s+token\s*=\s*authHeader\.split\(' '\)\[1\];\s*"
    r"const\s+decoded\s*=\s*jwt\.verify\(token,\s*JWT_SECRET\)\s*as\s*any;\s*",
    re.MULTILINE | re.DOTALL
)

def repl(m):
    return f"{m.group(1)}requireAuth, async (req: any, res) => {{\n  try {{\n    const decoded = {{ id: req.userId, username: req.username }};\n"

new_code = pattern.sub(repl, code)

with open('backend/server.ts', 'w', encoding='utf-8') as f:
    f.write(new_code)

print("Refactored inline auth.")

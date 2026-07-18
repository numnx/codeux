import re
import json
import subprocess

with open('dashboard/src/v2/i18n/messages/stats.ts', 'r') as f:
    content = f.read()

en_match = re.search(r'en:\s*\{([\s\S]*?)\s*\},\s*de:\s*\{', content)
en_content = en_match.group(1)

subprocess.run("grep -rnE 'locale\s*===\s*[\"\'\'](en|de)[\"\'\']' dashboard/src/v2/pages/stats/ dashboard/src/v2/components/stats/ > grep_locale.txt", shell=True)

with open('grep_locale.txt', 'r') as f:
    lines = f.readlines()

pairs = []
for line in lines:
    matches = re.findall(r'locale\s*===\s*[\'"]de[\'"]\s*\?\s*([\'"`])(.*?)(?<!\\)\1\s*:\s*([\'"`])(.*?)(?<!\\)\3', line)
    for m in matches: pairs.append((m[3], m[1]))
    matches2 = re.findall(r'locale\s*===\s*[\'"]de[\'"]\s*\?\s*\(([\'"`])(.*?)(?<!\\)\1\s*:\s*([\'"`])(.*?)(?<!\\)\3\)', line)
    for m in matches2: pairs.append((m[3], m[1]))

unique_pairs = list(set(pairs))
unique_pairs.sort(key=lambda x: x[0])

existing_strings = set()
for m in re.finditer(r'"([^"\\]*(?:\\.[^"\\]*)*)"', en_content):
    existing_strings.add(m.group(1))

existing_keys = set()
for m in re.finditer(r'([a-zA-Z0-9_]+)\s*:', en_content):
    existing_keys.add(m.group(1))

results = []
for en, de in unique_pairs:
    placeholders_en = re.findall(r'\$\{([^}]+)\}', en)
    placeholders_de = re.findall(r'\$\{([^}]+)\}', de)

    en_fixed = en
    de_fixed = de
    for i, p in enumerate(placeholders_en):
        val_name = "value"
        if "tokens" in p.lower() or "token" in p.lower(): val_name = "tokens"
        elif "count" in p.lower() or "length" in p.lower() or "format" in p.lower(): val_name = "count"
        elif "cost" in p.lower() or "usd" in p.lower(): val_name = "cost"
        elif "duration" in p.lower() or "time" in p.lower() or "ms" in p.lower(): val_name = "duration"
        elif "rate" in p.lower() or "percent" in p.lower() or "share" in p.lower(): val_name = "rate"
        elif "provider" in p.lower(): val_name = "provider"
        elif "model" in p.lower(): val_name = "model"
        elif "label" in p.lower(): val_name = "label"
        elif "day" in p.lower(): val_name = "day"

        p_name = val_name
        c = 1
        while f"{{{p_name}}}" in en_fixed[:en_fixed.find(f"${{{p}}}")]:
            p_name = f"{val_name}{c}"
            c += 1

        en_fixed = en_fixed.replace(f"${{{p}}}", f"{{{p_name}}}")
        if i < len(placeholders_de):
            de_fixed = de_fixed.replace(f"${{{placeholders_de[i]}}}", f"{{{p_name}}}")

    en_fixed = en_fixed.strip()
    de_fixed = de_fixed.strip()

    if en_fixed in existing_strings: continue

    s = en_fixed.replace("...", "").replace(".", "").replace(",", "").replace("-", " ")
    s = re.sub(r'\{[^}]+\}', '', s)
    words = s.split()
    stopwords = {"a", "an", "the", "and", "or", "but", "of", "to", "for", "with", "on", "at", "by", "from", "in", "is", "are", "be", "this", "that", "it", "so", "will", "appear", "after"}
    filtered = [w for w in words if w.lower() not in stopwords]
    if len(filtered) == 0: filtered = words
    if len(filtered) > 4: filtered = filtered[:4]
    if len(filtered) == 0:
        key = "key" + str(hash(en_fixed) % 10000)
    else:
        key = filtered[0].lower() + "".join([w.capitalize() for w in filtered[1:]])
    key = re.sub(r'[^a-zA-Z0-9]', '', key)

    if not key or key in existing_keys or key in ['active', 'status', 'provider', 'median', 'metric', 'input', 'cached', 'output', 'reasoning', 'unknown', 'unavailable', 'unsupported', 'reported', 'estimated', 'cost', 'name', 'sprint', 'task', 'tokens', 'other', 'error', 'all', 'default']:
        key = key + "Str"

    original_key = key
    counter = 1
    while key in existing_keys:
        key = f"{original_key}_{counter}"
        counter += 1
    existing_keys.add(key)
    existing_strings.add(en_fixed)

    results.append({
        "key": key,
        "en": en_fixed,
        "de": de_fixed
    })

with open('extracted.json', 'w') as f:
    json.dump(results, f, indent=2)

print("done python")

#!/usr/bin/env python3
"""
Gera data/condominios/<cidade>.csv (nome;endereco;bairro;cep;cidade) a partir dos dados abertos de CNPJ
da Receita Federal (espelho em Parquet no Hugging Face, lido direto pela rede com DuckDB: só baixa o necessário).

Uso:  python3 scripts/receita.py "Mogi das Cruzes;São José dos Campos"
Variáveis opcionais:  CNPJ_DATASET (padrão andrelacerda23/cnpj-dados-receita-brasil-2026-10)
                      CNPJ_ROOT (para teste local: pasta com estabelecimentos/ empresas/ municipios/)
"""
import csv, json, os, re, sys, tempfile, time, unicodedata, urllib.request
import duckdb

DS = os.environ.get('CNPJ_DATASET', 'andrelacerda23/cnpj-dados-receita-brasil-2026-10')
ROOT = os.environ.get('CNPJ_ROOT') or ('hf://datasets/' + DS)
CNAE, ATIVA = '8112500', '02'

def norm(s):
    s = unicodedata.normalize('NFD', s or '')
    return re.sub(r'[^a-z0-9 ]+', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()).strip()

def titulo(s):
    peq = {'de', 'da', 'do', 'das', 'dos', 'e'}
    return ' '.join(w if (i and w in peq) else w.capitalize() for i, w in enumerate((s or '').strip().lower().split()))


def http(url, tries=8):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'achados-bot'}), timeout=180)
        except Exception as e:
            espera = min(240, 20 * (i + 1))
            print('  tentativa', i + 1, 'falhou:', str(e)[:80], '- aguardando', espera, 's', flush=True)
            time.sleep(espera)
    sys.exit('Não consegui baixar: ' + url)

def listar(pasta):
    if os.environ.get('CNPJ_ROOT'):
        d = os.path.join(ROOT, pasta); return [os.path.join(d, f) for f in sorted(os.listdir(d))]
    j = json.load(http('https://huggingface.co/api/datasets/%s/tree/main/%s' % (DS, pasta)))
    return sorted(x['path'] for x in j if x['path'].endswith('.parquet'))

def local(path, tmp):
    if os.environ.get('CNPJ_ROOT'): return path
    dest = os.path.join(tmp, os.path.basename(path))
    with http('https://huggingface.co/datasets/%s/resolve/main/%s' % (DS, path)) as r, open(dest, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    return dest

def apaga(f):
    if not os.environ.get('CNPJ_ROOT'):
        try: os.remove(f)
        except OSError: pass

def main():
    cidades = [c.strip() for c in (sys.argv[1] if len(sys.argv) > 1 else 'Mogi das Cruzes').split(';') if c.strip()]
    ncid = {norm(c): c for c in cidades}
    con = duckdb.connect()
    print('Fonte:', ROOT, flush=True)
    tmp = tempfile.mkdtemp()
    f = local(listar('municipios')[0], tmp)
    mun = con.execute("select codigo, descricao from read_parquet('%s')" % f).fetchall(); apaga(f)
    cod = {c: norm(d) for c, d in mun if norm(d) in ncid}
    if not cod: sys.exit('Nenhuma cidade encontrada em municipios. Confira o nome.')
    print('Municípios:', cod, flush=True)
    lista = ",".join("'%s'" % c for c in cod)
    est = {}
    for p in listar('estabelecimentos'):
        f = local(p, tmp)
        for r in con.execute(f"select cnpj_basico, nome_fantasia, tipo_logradouro, logradouro, numero, bairro, cep, municipio from read_parquet('{f}') where situacao_cadastral = '{ATIVA}' and cnae_fiscal_principal = '{CNAE}' and municipio in ({lista})").fetchall():
            est.setdefault(r[0], []).append(r)
        apaga(f); print(os.path.basename(p), 'ok;', sum(len(v) for v in est.values()), 'até agora', flush=True)
    razao = {}
    bases = ",".join("'%s'" % b for b in est) or "''"
    for p in listar('empresas'):
        f = local(p, tmp)
        for b, rz in con.execute(f"select cnpj_basico, razao_social from read_parquet('{f}') where cnpj_basico in ({bases})").fetchall(): razao[b] = rz
        apaga(f); print(os.path.basename(p), 'ok', flush=True)
    rows = [(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], razao.get(r[0], '')) for v in est.values() for r in v]
    print('Estabelecimentos encontrados:', len(rows), flush=True)
    por = {c: [] for c in ncid}; vistos = set()
    for base, fant, tl, lg, num, bairro, cep, mun_c, razao in rows:
        cid = cod[mun_c]
        n = titulo(fant or razao or '')
        n = re.sub(r'^(Condominio|Cond\.?)\s', 'Condomínio ', n)
        if len(n) < 4: continue
        if not norm(n).startswith('condominio'): n = 'Condomínio ' + n
        rua = ((tl or '') + ' ' + (lg or '')).strip(); nu = (num or '').strip()
        end = (titulo(rua) + (', ' + nu if nu and nu.upper() != 'S/N' else '')).strip(', ')
        chave = (cid, norm(n), norm(end))
        if chave in vistos: continue
        vistos.add(chave)
        por[cid].append([n, end, titulo(bairro), re.sub(r'\D', '', cep or ''), ncid[cid]])
    os.makedirs('data/condominios', exist_ok=True)
    for cid, lst in por.items():
        lst.sort(key=lambda x: x[0])
        arq = 'data/condominios/' + cid.replace(' ', '-') + '.csv'
        with open(arq, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, delimiter=';'); w.writerow(['nome', 'endereco', 'bairro', 'cep', 'cidade']); w.writerows(lst)
        print(ncid[cid], len(lst), '->', arq, flush=True)
    with open('data/condominios/ATUALIZADO.txt', 'w') as f: f.write(DS + '\n')

main()

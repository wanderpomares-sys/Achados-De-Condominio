#!/usr/bin/env python3
"""
Gera data/condominios/<cidade>.csv (nome;endereco;bairro;cep;cidade) a partir dos dados abertos de CNPJ
da Receita Federal (espelho em Parquet no Hugging Face, lido direto pela rede com DuckDB: só baixa o necessário).

Uso:  python3 scripts/receita.py "Mogi das Cruzes;São José dos Campos"
Variáveis opcionais:  CNPJ_DATASET (padrão andrelacerda23/cnpj-dados-receita-brasil-2026-10)
                      CNPJ_ROOT (para teste local: pasta com estabelecimentos/ empresas/ municipios/)
"""
import csv, os, re, sys, unicodedata
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

def main():
    cidades = [c.strip() for c in (sys.argv[1] if len(sys.argv) > 1 else 'Mogi das Cruzes').split(';') if c.strip()]
    ncid = {norm(c): c for c in cidades}
    con = duckdb.connect()
    print('Fonte:', ROOT, flush=True)
    mun = con.execute("select codigo, descricao from read_parquet('%s/municipios/*.parquet')" % ROOT).fetchall()
    cod = {c: norm(d) for c, d in mun if norm(d) in ncid}
    if not cod: sys.exit('Nenhuma cidade encontrada em municipios. Confira o nome.')
    print('Municípios:', cod, flush=True)
    lista = ",".join("'%s'" % c for c in cod)
    q = f"""
      select e.cnpj_basico, e.nome_fantasia, e.tipo_logradouro, e.logradouro, e.numero, e.bairro, e.cep, e.municipio, em.razao_social
      from read_parquet('{ROOT}/estabelecimentos/*.parquet') e
      left join read_parquet('{ROOT}/empresas/*.parquet') em using (cnpj_basico)
      where e.situacao_cadastral = '{ATIVA}' and e.cnae_fiscal_principal = '{CNAE}' and e.municipio in ({lista})
    """
    rows = con.execute(q).fetchall()
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

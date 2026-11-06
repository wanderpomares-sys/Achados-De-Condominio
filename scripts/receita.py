#!/usr/bin/env python3
"""
Gera a lista de condomínios de uma cidade a partir dos dados abertos de CNPJ da Receita Federal.

Como usar (no computador):
  1. Baixe, do portal de Dados Abertos do CNPJ da Receita Federal, os arquivos
     Estabelecimentos0.zip ... Estabelecimentos9.zip, Empresas0.zip ... Empresas9.zip e Municipios.zip
     e coloque todos numa mesma pasta (NÃO precisa descompactar).
  2. Rode:   python condominios_receita.py PASTA "Mogi das Cruzes"
     (ou "São José dos Campos"; pode passar mais de uma cidade separadas por ;)
     Filtros opcionais (podem ser combinados):
        --bairro "Centro;Vila Oliveira"     só esses bairros
        --cep 08710;08730                   só CEPs que começam assim
  3. Sai o arquivo  condominios_<cidade>.csv  (nome;endereco;bairro;cep;cidade) para importar no painel do app.

Só usa a biblioteca padrão do Python 3.
"""
import csv, datetime, glob, io, os, re, sys, tempfile, unicodedata, urllib.request, zipfile

CNAE = '8112500'      # condomínios prediais (fallback: 8111700 serviços combinados não entra)
ATIVA = '02'


BASE = 'https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/'

def mes_disponivel():
    d = datetime.date.today().replace(day=1)
    for _ in range(8):
        m = d.strftime('%Y-%m')
        try:
            req = urllib.request.Request(BASE + m + '/Municipios.zip', method='HEAD')
            urllib.request.urlopen(req, timeout=60)
            return m
        except Exception:
            d = (d - datetime.timedelta(days=1)).replace(day=1)
    sys.exit('Não achei pasta recente na Receita (' + BASE + ')')

def baixa(mes, nome, tmp):
    dest = os.path.join(tmp, nome)
    with urllib.request.urlopen(BASE + mes + '/' + nome, timeout=120) as r, open(dest, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    return dest

def norm(s):
    s = unicodedata.normalize('NFD', s or '')
    return re.sub(r'[^a-z0-9 ]+', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()).strip()

def rows(zpath):
    with zipfile.ZipFile(zpath) as z:
        for name in z.namelist():
            with z.open(name) as f:
                for line in io.TextIOWrapper(f, encoding='latin-1', newline=''):
                    yield next(csv.reader([line], delimiter=';', quotechar='"'))

def titulo(s):
    s = (s or '').strip().lower()
    peq = {'de', 'da', 'do', 'das', 'dos', 'e'}
    return ' '.join(w if (i and w in peq) else w.capitalize() for i, w in enumerate(s.split()))

def main():
    cidades_txt = sys.argv[1] if len(sys.argv) > 1 else 'Mogi das Cruzes'
    cidades = [c.strip() for c in cidades_txt.split(';') if c.strip()]
    ncid = {norm(c): c for c in cidades}
    mes = mes_disponivel(); print('Mês da Receita:', mes)
    tmp = tempfile.mkdtemp()
    cod = {}
    mz = baixa(mes, 'Municipios.zip', tmp)
    for r in rows(mz):
        if len(r) >= 2 and norm(r[1]) in ncid: cod[r[0]] = norm(r[1])
    os.remove(mz)
    if not cod: sys.exit('Nenhuma cidade encontrada em Municipios.zip')
    print('Municípios:', cod)
    est = {}
    for i in range(10):
        z = baixa(mes, 'Estabelecimentos%d.zip' % i, tmp); n = 0
        for r in rows(z):
            if len(r) < 21 or r[5] != ATIVA or r[20] not in cod or r[11] != CNAE: continue
            rua = (r[13] + ' ' + r[14]).strip(); num = r[15].strip()
            end = (titulo(rua) + (', ' + num if num and num.upper() != 'S/N' else '')).strip(', ')
            est.setdefault(r[0], []).append({'cid': cod[r[20]], 'fantasia': r[4], 'endereco': end, 'bairro': titulo(r[17]), 'cep': r[18]})
            n += 1
        os.remove(z); print('Estabelecimentos%d' % i, n, flush=True)
    nome = {}
    for i in range(10):
        z = baixa(mes, 'Empresas%d.zip' % i, tmp)
        for r in rows(z):
            if r and r[0] in est: nome[r[0]] = r[1]
        os.remove(z); print('Empresas%d ok' % i, flush=True)
    os.makedirs('data/condominios', exist_ok=True)
    por = {c: [] for c in ncid}; vistos = set()
    for base, lst in est.items():
        for e in lst:
            n = titulo(e['fantasia'] or nome.get(base, ''))
            n = re.sub(r'^(Condominio|Cond\.?)\s', 'Condomínio ', n)
            if len(n) < 4: continue
            if not norm(n).startswith('condominio'): n = 'Condomínio ' + n
            chave = (e['cid'], norm(n), norm(e['endereco']))
            if chave in vistos: continue
            vistos.add(chave)
            por[e['cid']].append([n, e['endereco'], e['bairro'], re.sub(r'\D', '', e['cep']), ncid[e['cid']]])
    for c, lst in por.items():
        lst.sort(key=lambda x: x[0])
        arq = 'data/condominios/' + norm(c).replace(' ', '-') + '.csv'
        with open(arq, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, delimiter=';'); w.writerow(['nome', 'endereco', 'bairro', 'cep', 'cidade']); w.writerows(lst)
        print(c, len(lst), '->', arq)
    with open('data/condominios/ATUALIZADO.txt', 'w') as f: f.write(mes + '\n')

main()

#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import argparse, re, shutil, sys

TEXT_EXTS={'.ts','.tsx','.js','.jsx','.mjs','.mts','.cjs','.css','.json','.md','.svg','.d.ts','.d.mts'}
ROOT_DIRS=('app','lib','scripts')

LITERAL_REPLACEMENTS=[
    ('NEW ERA','GOLD JACKET'),('New Era','Gold Jacket'),('new era','gold jacket'),
    ('NEW-ERA','GOLD-JACKET'),('New-Era','Gold-Jacket'),('new-era','gold-jacket'),
    ('NEW_ERA','GOLD_JACKET'),('New_Era','Gold_Jacket'),('new_era','gold_jacket'),
    ('NEWERA','GOLDJACKET'),('NewEra','GoldJacket'),('newEra','goldJacket'),('newera','goldjacket'),
]
FORBIDDEN=(re.compile(r'new\s*era',re.I),re.compile(r'new[-_]era',re.I))
URL_FORBIDDEN=re.compile(r'https?://[^\s\"\'`]*(?:new\s*era|new[-_]era)[^\s\"\'`]*',re.I)
PERSISTENT_HINTS=('.from(', '.rpc(', 'storage.from(')

def replace_brand_text(text:str)->str:
    out=text
    for old,new in LITERAL_REPLACEMENTS:
        out=out.replace(old,new)
    # Mixed-case leftovers, but preserve code-like separator style.
    out=re.sub(r'\bnew\s+era\b','Gold Jacket',out,flags=re.I)
    out=re.sub(r'\bnew-era\b','gold-jacket',out,flags=re.I)
    out=re.sub(r'\bnew_era\b','gold_jacket',out,flags=re.I)
    out=re.sub(r'\bnewera\b','goldjacket',out,flags=re.I)
    return out

def replace_path_name(name:str)->str:
    out=name
    for old,new in [
        ('NEW-ERA','GOLD-JACKET'),('New-Era','Gold-Jacket'),('new-era','gold-jacket'),
        ('NEW_ERA','GOLD_JACKET'),('New_Era','Gold_Jacket'),('new_era','gold_jacket'),
        ('NEWERA','GOLDJACKET'),('NewEra','GoldJacket'),('newEra','goldJacket'),('newera','goldjacket'),
        ('NEW ERA','GOLD JACKET'),('New Era','Gold Jacket'),('new era','gold jacket'),
    ]:
        out=out.replace(old,new)
    return out

def iter_text_files(root:Path):
    for top_name in ROOT_DIRS:
        top=root/top_name
        if not top.exists(): continue
        for p in top.rglob('*'):
            if p.is_file() and (p.suffix in TEXT_EXTS or p.name.endswith(('.d.ts','.d.mts'))):
                yield p
    for name in ('package.json','package-lock.json'):
        p=root/name
        if p.exists() and p.is_file(): yield p

def dangerous_refs(root:Path):
    hits=[]
    for p in iter_text_files(root):
        try: lines=p.read_text(errors='ignore').splitlines()
        except Exception: continue
        for idx,line in enumerate(lines,1):
            if not any(rx.search(line) for rx in FORBIDDEN): continue
            if any(hint in line for hint in PERSISTENT_HINTS):
                hits.append((p.relative_to(root),idx,'persistent-data identifier',line.strip()))
            url=URL_FORBIDDEN.search(line)
            if url:
                hits.append((p.relative_to(root),idx,'legacy URL',line.strip()))
    return hits

def merge_dir(src:Path,dst:Path):
    dst.mkdir(parents=True,exist_ok=True)
    for child in list(src.iterdir()):
        target=dst/child.name
        if not target.exists():
            shutil.move(str(child),str(target)); continue
        if child.is_dir() and target.is_dir():
            merge_dir(child,target); continue
        if child.is_file() and target.is_file() and child.read_bytes()==target.read_bytes():
            child.unlink(); continue
        raise RuntimeError(f'Path collision while rebranding: {child} -> {target}')
    src.rmdir()

def rename_legacy_paths(root:Path):
    changed=[]
    for top_name in ROOT_DIRS:
        top=root/top_name
        if not top.exists(): continue
        paths=sorted(list(top.rglob('*')),key=lambda p:len(p.parts),reverse=True)
        for p in paths:
            if not p.exists(): continue
            new_name=replace_path_name(p.name)
            if new_name==p.name: continue
            target=p.with_name(new_name)
            if target.exists():
                if p.is_dir() and target.is_dir(): merge_dir(p,target)
                elif p.is_file() and target.is_file() and p.read_bytes()==target.read_bytes(): p.unlink()
                else: raise RuntimeError(f'Path collision while rebranding: {p} -> {target}')
            else:
                p.rename(target)
            changed.append((p,target))
    return changed

def migrate_env_keys(root:Path):
    env=root/'.env.local'
    if not env.exists(): return []
    lines=env.read_text().splitlines()
    existing_keys=set()
    for line in lines:
        m=re.match(r'\s*([A-Z0-9_]+)\s*=',line)
        if m: existing_keys.add(m.group(1))
    migrated=[]; out=[]
    for line in lines:
        m=re.match(r'(\s*)([A-Z0-9_]+)(\s*=.*)',line)
        if not m:
            out.append(line); continue
        prefix,key,rest=m.groups()
        new_key=key.replace('NEW_ERA','GOLD_JACKET').replace('NEWERA','GOLDJACKET')
        if new_key==key:
            out.append(line); continue
        if new_key in existing_keys:
            migrated.append((key,new_key,'dropped duplicate old key'))
            continue
        out.append(prefix+new_key+rest)
        existing_keys.add(new_key)
        migrated.append((key,new_key,'renamed'))
    env.write_text('\n'.join(out)+'\n')
    return migrated

def scan_remaining(root:Path):
    content=[]
    for p in iter_text_files(root):
        text=p.read_text(errors='ignore')
        if any(rx.search(text) for rx in FORBIDDEN): content.append(str(p.relative_to(root)))
    paths=[]
    for top_name in ROOT_DIRS:
        top=root/top_name
        if not top.exists(): continue
        for p in top.rglob('*'):
            if any(rx.search(p.name) for rx in FORBIDDEN): paths.append(str(p.relative_to(root)))
    return sorted(set(content)),sorted(set(paths))

def run(root:Path):
    root=root.resolve()
    dangerous=dangerous_refs(root)
    if dangerous:
        print('ERROR: Found legacy identifiers that may point at live persistent data or an existing URL.')
        print('Refusing to rename these blindly:')
        for rel,line,kind,text in dangerous:
            print(f' - {rel}:{line} [{kind}] {text}')
        return 2
    changed_files=[]
    for p in list(iter_text_files(root)):
        old=p.read_text(errors='ignore')
        new=replace_brand_text(old)
        if new!=old:
            p.write_text(new); changed_files.append(str(p.relative_to(root)))
    renamed=rename_legacy_paths(root)
    # A path rename can expose additional text files under a new location; sweep once more.
    for p in list(iter_text_files(root)):
        old=p.read_text(errors='ignore'); new=replace_brand_text(old)
        if new!=old:
            p.write_text(new)
            rel=str(p.relative_to(root))
            if rel not in changed_files: changed_files.append(rel)
    env=migrate_env_keys(root)
    content,paths=scan_remaining(root)
    print(f'Updated brand content in {len(changed_files)} file(s).')
    print(f'Renamed {len(renamed)} legacy runtime path(s).')
    if env: print(f'Migrated {len(env)} legacy .env.local key(s) without changing their values.')
    if content or paths:
        print('ERROR: Legacy runtime branding still remains after cleanup.')
        for x in content: print(' content:',x)
        for x in paths: print(' path:',x)
        return 3
    print('Gold Jacket runtime cleanup complete: no legacy brand content or runtime path names remain.')
    return 0

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--root',default='.')
    args=ap.parse_args(); raise SystemExit(run(Path(args.root)))
if __name__=='__main__': main()

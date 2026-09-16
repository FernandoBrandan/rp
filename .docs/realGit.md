# Git — Guía práctica completa

## 🔧 Setup inicial (una vez)

```bash
# Identidad
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"

# Editor por defecto
git config --global core.editor "code --wait"

# Default branch = main
git config --global init.defaultBranch main

# Mejor output
git config --global alias.st "status -sb"
git config --global alias.lg "log --oneline --graph --decorate --all"

# Ver config actual
git config --list
```

---

## 📅 Flujo diario (lo que hacés 90% del tiempo)

### Antes de empezar a trabajar

```bash
git status                    # ¿qué cambió?
git pull origin main          # traer cambios remotos
```

### Ciclo normal

```bash
git status                    # ver qué tocaste
git diff                      # ver cambios exactos (no staged)
git diff --staged             # ver cambios staged
git add archivo.ts            # stage un archivo
git add .                     # stage todo
git commit -m "feat: ..."     # commit
git push origin main          # subir
```

### Commits siguiendo Conventional Commits

```bash
git commit -m "feat(products): add count endpoint"
git commit -m "fix(cart): prevent negative quantity"
git commit -m "refactor(order): extract transition table"
git commit -m "docs(readme): update install steps"
git commit -m "chore(deps): bump nest to 11.1"
git commit -m "test(order): cover idempotency case"
```

**Tipos**: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`, `perf`, `build`, `ci`.

---

## 🌳 Ramas (branching)

### Crear y cambiar

```bash
git branch                          # listar locales
git branch -a                       # listar todas (incluye remotas)
git checkout -b feat/nuevo-endpoint # crear + cambiar
git switch -c feat/nuevo-endpoint   # lo mismo (moderno)
git switch main                     # volver a main
```

### Push de una rama nueva

```bash
git push -u origin feat/nuevo-endpoint
# -u = upstream, la próxima vez basta con "git push"
```

### Merge a main

```bash
git switch main
git pull origin main
git merge feat/nuevo-endpoint
git push origin main
git branch -d feat/nuevo-endpoint          # borrar local
git push origin --delete feat/nuevo-endpoint  # borrar remota
```

### Rebase (historial limpio, alternativa a merge)

```bash
git switch feat/nuevo-endpoint
git rebase main
# Resolver conflictos si hay
git rebase --continue
# o abortar:
git rebase --abort
```

---

## 🚨 Deshacer cosas (la parte más importante)

### Todavía no hiciste commit

```bash
# Descartar cambios en un archivo (¡pierde cambios!)
git restore archivo.ts

# Descartar TODO lo no commiteado
git restore .

# Sacar un archivo del staging (sin perder cambios)
git restore --staged archivo.ts

# Antiguo (todavía funciona)
git checkout -- archivo.ts
git reset HEAD archivo.ts
```

### Ya commiteaste pero no pusheaste

```bash
# Deshacer el último commit, MANTENER cambios staged
git reset --soft HEAD~1

# Deshacer el último commit, MANTENER cambios sin staged
git reset HEAD~1           # o --mixed
git reset --mixed HEAD~1

# Deshacer el último commit, PERDER cambios
git reset --hard HEAD~1

# Deshacer los últimos 3 commits (soft)
git reset --soft HEAD~3
```

### Ya pusheaste

```bash
# Forma segura: revert (crea un commit nuevo que deshace)
git revert <commit-hash>
git push origin main

# Revertir el último commit pusheado
git revert HEAD
git push origin main

# Forma peligrosa (reescribe historia, solo si estás solo en la rama)
git reset --hard HEAD~1
git push --force-with-lease origin main
# --force-with-lease es más seguro que --force
```

### Modificar el último commit (mensaje o contenido)

```bash
# Solo el mensaje
git commit --amend -m "nuevo mensaje"

# Agregar un archivo olvidado
git add olvidado.ts
git commit --amend --no-edit

# ⚠️ Si ya pusheaste: git push --force-with-lease
```

---

## 🗂️ Stash (guardar cambios temporalmente)

```bash
git stash                       # guardar todo lo no commiteado
git stash -m "wip: products"    # con mensaje
git stash -u                    # incluir archivos nuevos (untracked)
git stash list                  # ver stashes
git stash pop                   # aplicar y borrar el último
git stash apply                 # aplicar sin borrar
git stash apply stash@{2}       # aplicar uno específico
git stash drop stash@{0}        # borrar uno
git stash clear                 # borrar todos
```

**Caso típico**: estás en medio de algo, tenés que cambiar a otra rama urgente:

```bash
git stash -u
git switch hotfix/urgente
# ... resolvés ...
git switch feat/lo-que-estaba
git stash pop
```

---

## ⚔️ Conflictos

**Cuándo pasa**: mismo archivo, mismas líneas, modificado en dos lados.

```bash
git pull origin main
# CONFLICT in src/foo.ts
```

**Resolver**:

1. Abrir el archivo. Verás:
   ```
   <<<<<<< HEAD
   tu versión
   =======
   versión remota
   >>>>>>> origin/main
   ```
2. Editar manualmente → dejar solo lo correcto (borrar los marcadores).
3. Marcar resuelto:
   ```bash
   git add src/foo.ts
   git commit                  # (si fue merge)
   # o
   git rebase --continue       # (si fue rebase)
   ```

**Abortar**:

```bash
git merge --abort
git rebase --abort
git cherry-pick --abort
```

**Herramienta visual**:

```bash
git mergetool    # abre VS Code / meld / lo que tengas configurado
```

---

## 🔍 Inspeccionar

```bash
git log                          # historial
git log --oneline                # resumido
git log --oneline --graph --all  # con ramas
git log -p archivo.ts            # historial de un archivo
git log --author="Fernando"      # filtrar por autor
git log --since="2 days ago"

git show <hash>                  # ver un commit
git show <hash>:archivo.ts       # ver un archivo en ese commit

git blame archivo.ts             # quién escribió cada línea
git diff main..feat/x            # diferencias entre ramas
git diff HEAD~3..HEAD            # últimos 3 commits

git reflog                       # historial de TODO (incluye resets)
```

---

## 🆘 Recuperar trabajo perdido (reflog)

**El reflog salva vidas**. Registra todo lo que hiciste, incluso después de `reset --hard`.

```bash
git reflog
# a1b2c3d HEAD@{0}: reset: moving to HEAD~1
# 9f8e7d6 HEAD@{1}: commit: feat: algo importante   ← este lo perdiste
# ...

# Recuperar
git reset --hard 9f8e7d6
# o crear rama nueva apuntando ahí
git branch recuperado 9f8e7d6
```

---

## 🏷️ Tags (releases)

```bash
git tag                              # listar
git tag v1.0.0                       # tag simple
git tag -a v1.0.0 -m "Release 1.0"   # tag anotado (recomendado)
git push origin v1.0.0               # subir uno
git push origin --tags               # subir todos

# Borrar
git tag -d v1.0.0
git push origin --delete v1.0.0
```

---

## 🎯 Casos prácticos combinados

### Caso 1 — Trabajar en feature, main cambió

```bash
git switch feat/x
git fetch origin
git rebase origin/main
# resolver conflictos
git push --force-with-lease origin feat/x
```

### Caso 2 — Commit en rama equivocada

```bash
# Estás en main, pero querías commitear en feat/x
git log --oneline -1           # copiar el hash
git reset --hard HEAD~1        # deshacer en main
git switch feat/x
git cherry-pick <hash>         # aplicar el commit acá
```

### Caso 3 — Un commit tuyo rompió main

```bash
git switch main
git pull
git revert <hash-del-commit-malo>
git push
```

### Caso 4 — Necesitás un archivo de otra rama

```bash
git checkout feat/x -- src/archivo.ts
```

### Caso 5 — Un archivo de otra rama sin cambiar de rama

```bash
git show feat/x:src/archivo.ts > /tmp/archivo.ts
```

### Caso 6 — Ver qué cambió entre dos releases

```bash
git diff v1.0.0..v1.1.0 --stat
```

### Caso 7 — Borrar archivo del repo (pero no del disco)

```bash
git rm --cached archivo.env    # no lo trackea más
echo "archivo.env" >> .gitignore
git commit -m "chore: stop tracking archivo.env"
```

### Caso 8 — Pusheaste un secreto por error

```bash
# 1. Cambiar el secreto YA (en el proveedor)
# 2. Remover del repo:
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "chore: remove .env from repo"
git push

# ⚠️ El secreto SIGUE en el historial.
# Si es crítico: usar git-filter-repo o BFG Repo-Cleaner.
# Y rotar el secreto igual.
```

### Caso 9 — Resetear una rama local a lo que hay en remoto

```bash
git fetch origin
git reset --hard origin/main
```

### Caso 10 — Guardar el trabajo y traer cambios de main

```bash
git stash -u
git pull origin main
git stash pop
# resolver conflictos si hay
```

---

## 📌 Tabla de "deshacer" según situación

| Situación                         | Comando                                  |
| --------------------------------- | ---------------------------------------- |
| Cambios sin commitear, descartar  | `git restore .`                          |
| Sacar del stage                   | `git restore --staged archivo`           |
| Último commit, mantener cambios   | `git reset --soft HEAD~1`                |
| Último commit, borrar cambios     | `git reset --hard HEAD~1`                |
| Commit pusheado, deshacer         | `git revert <hash>`                      |
| Cambiar mensaje del último commit | `git commit --amend -m "..."`            |
| Perdiste algo con reset           | `git reflog` + `git reset --hard <hash>` |
| Modificar commit viejo            | `git rebase -i HEAD~N`                   |

---

## 🎨 `git rebase -i` — el editor de historia

```bash
git rebase -i HEAD~3      # editar los últimos 3 commits
```

Se abre un editor con:

```
pick abc123 feat: a
pick def456 fix: b
pick ghi789 chore: c
```

Cambiás `pick` por:

- `squash` (s) → combina con el anterior
- `reword` (r) → solo cambiar mensaje
- `edit` (e) → pausar para modificar
- `drop` (d) → borrar el commit

**Ejemplo — combinar 3 commits en 1**:

```
pick abc123 feat: a
squash def456 fix: b
squash ghi789 chore: c
```

**⚠️ Solo en ramas que no compartiste.** Si ya pusheaste, `--force-with-lease`.

---

## 🧠 Reglas de oro

1. **Commit chico y frecuente**. Un cambio lógico por commit.
2. **Nunca commitees secretos**. `.env` al `.gitignore` antes que nada.
3. **`git pull` antes de `git push`**. Siempre.
4. **`--force-with-lease` en vez de `--force`**. Te avisa si alguien más pusheó.
5. **`revert` en ramas compartidas**, `reset` solo en locales o ramas tuyas.
6. **`git status` antes de cada comando**. Te ahorra el 90% de los errores.
7. **`git reflog` salva todo**. Casi nunca perdés trabajo de verdad.
8. **Una rama = una cosa**. No mezcles feature + fix + refactor.
9. **Mensajes en imperativo**: "add", "fix", "remove" — no "added", "fixed".
10. **Antes de push a main**: CI local (`npm test && npm run lint && npm run build`).

---

## 🚀 Aliases útiles (agregalos una vez)

```bash
git config --global alias.st "status -sb"
git config --global alias.co "checkout"
git config --global alias.sw "switch"
git config --global alias.br "branch"
git config --global alias.cm "commit -m"
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.last "log -1 HEAD --stat"
git config --global alias.unstage "restore --staged"
git config --global alias.undo "reset --soft HEAD~1"
git config --global alias.wip "commit -am 'wip'"
```

Después:

```bash
git st          # status cortito
git lg          # log gráfico
git undo        # deshacer último commit
```

---

## 🆘 Cheat sheet de emergencia

```bash
# "Me equivoqué, quiero volver todo atrás como estaba"
git reflog
git reset --hard <hash-donde-estaba-bien>

# "Rompí main, hay que revertir YA"
git revert <hash>
git push

# "Necesito trabajar en otra cosa urgente sin perder esto"
git stash -u

# "Estoy en conflicto y me perdí"
git merge --abort
git rebase --abort

# "No sé qué pasó"
git log --oneline --graph --all
git reflog
```

Con esto cubrís el 99% de los casos. El resto se aprende rompiendo cosas en una rama de prueba.

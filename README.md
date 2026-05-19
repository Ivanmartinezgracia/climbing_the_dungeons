# Climbing The Dungeon

Roguelike top-down pixel-art dungeon crawler. Sube de piso, mata enemigos, mejora tu equipamiento, no te mueras.

## Cómo ejecutar

```bash
node server.js
# Abrir http://127.0.0.1:8080
```

Stack: Vanilla JS (ES2023+, módulos ES), HTML, CSS. Sin bundlers ni frameworks. Canvas 2D.

## Estructura del proyecto

```
index.html               — Entry point, carga main.js como módulo
server.js                — Servidor HTTP Node (puerto 8080)
css/
  style.css              — Estilos globales, canvas, overlay
  menu.css               — Estilos menús, HUD, paneles
js/
  main.js                — Bootstrap: obtiene canvas, crea Game, inicia loop
  engine/
    Game.js              — Máquina de estados, game loop, lógica principal
    Input.js             — Input (teclado + mouse), polling con just-pressed
    Camera.js            — Cámara que sigue al jugador (lerp + snap)
    Renderer.js          — Renderiza dungeon, entidades, partículas, mascotas
  entities/
    Player.js            — Stats, inventario 3 armas, upgrades, XP, mascotas, synergies
    Enemy.js             — Enemigo con chase/wander AI, elites, aura buff, burn DOT
    Pet.js               — Mascota que sigue al jugador, ataca enemigos, sube nivel, sinergias
  dungeon/
    Dungeon.js           — Generación procedural (BSP-lite), tiles, colisiones
    Room.js              — Sala: carve, decoraciones (spawn/normal/tesoro/boss)
    TileTypes.js         — Constantes de tiles (no usado actualmente)
  weapons/
    Weapon.js            — Arma con cargador, recarga, proyectiles, críticos
  ui/
    MainMenu.js          — Menú principal HTML con tienda y guía de mascotas
    CharacterSelect.js   — Selección de personaje HTML
    DungeonSelect.js     — Selección de mazmorra HTML
    HUD.js               — HUD: corazones, XP, nivel, monedas, arma, mascota, sinergias
    UpgradePanel.js      — Panel de mejora al subir de nivel
    PetGuide.js          — Guía de mascotas con sinergias
    GameOver.js          — Pantalla de muerte HTML
    Minimap.js           — Minimapa en canvas sobre HTML
  gfx/
    SpriteRenderer.js    — Dibuja jugador, armas, barra de recarga
    Particles.js         — Sistema de partículas simple
    Lighting.js          — Overlay de iluminación con gradiente radial
  systems/
    SaveSystem.js        — localStorage para monedas, desbloqueos, mascotas activas
  utils/
    constants.js         — Armas, mejoras, mazmorras, personajes, mascotas, sinergias
    math.js              — Vec2, lerp, clamp
    RNG.js               — RNG seedable para generación procedural
```

## Mecánicas clave

### Armas y munición
- Hasta **3 armas** en inventario. Cambiás con Q, Tab, rueda del mouse o 1/2/3.
- Recarga infinita: el cargador se recarga siempre sin consumir reserva.
- Recarga automática al vaciar el cargador o manual con **R**.
- Barra de progreso naranja bajo el personaje mientras recarga.
- Al recoger un arma del suelo con inventario lleno, el arma actual se **suelta en el piso** y se puede recoger de nuevo.

### Enemigos
- **5 tipos**: Esbirro, Corredor, Bruto, Lanzallamas (rango), Arquero (rango).
- **Deambulan aleatoriamente** por la sala cuando no han visto al jugador.
- Los enemigos de rango hacen **strafe** — se mueven lateralmente al disparar.
- **Elites** (a partir de piso 3, ~10-20% probabilidad): +150% HP, +50% daño, color dorado con aura. Buffean daño (1.5×) y velocidad (1.3×) a enemigos cercanos.
- **Hordas**: 20% de probabilidad al matar un enemigo no-élite de spawnear 1-2 crías.
- El rango de detección escala con el piso (12 px/piso).
- La cantidad de enemigos por sala escala cada 3 pisos.

### Mascotas y Sinergias
- **10 tipos**: Perro, Gato, Cuervo, Lobo, Dragón, Zorro, Búho, Oso, Conejo, Serpiente, Tigre, Fénix.
- Cada mascota tiene HP, daño, velocidad, forma y tipo (melé/rango) distintos.
- Siguen al jugador dentro de un radio y atacan enemigos automáticamente.
- Si mueren, respawnan tras un tiempo según el tipo y las mejoras.
- Suben de nivel con la XP de los enemigos que mata el jugador.
- **Hasta 2 mascotas activas** seleccionables en la tienda.
- **Sinergias**: ciertos pares de mascotas activan bonificaciones especiales (ej: Perro+Lobo = +1 daño ambos, Dragón+Fénix = daño de quemadura).
- **Mejoras de mascota** disponibles al subir nivel: +daño, +HP, +velocidad, +cadencia, -respawn.

### Progresión
- **26 mejoras acumulables**: al subir nivel aparecen 3 opciones aleatorias.
- **Permadeath**: al morir se pierde la run. Las monedas persisten.
- **Meta-progresión**: monedas para comprar personajes, mascotas y desbloquear mazmorras.

### Mazmorras

| Mazmorra | Pisos | Dificultad | Jefe |
|---|---|---|---|
| Cripta del Lamento Eterno | 15 | 1.0 | Rey Osario |
| Fronda Abisal | 12 | 1.2 | Raíz Primigenia |
| Vórtice Ígneo | 10 | 1.5 | Salamandrarca |
| Mortaja Helada | 10 | 1.5 | Corazón de Escarcha |
| Nexo Vacuo | 15 | 2.0 | Astaroth, el Devorador |

### Personajes

| Clase | HP | Vel | Arma inicial | Especial |
|---|---|---|---|---|
| Aventurero | 5 | 2.0 | Pistola | — |
| Caballero | 8 | 2.0 | Revólver | Cuchillo inicial |
| Mafioso | 3 | 2.5 | Subfusil | Sigilo (detección 50%) |
| Mago | 4 | 2.0 | Báculo Mágico | Perforación básica |
| Guardabosques | 5 | 2.5 | Rifle | — |

### Tienda de Mascotas
En el menú principal:
- Comprar mascotas con monedas.
- Elegir hasta **2 mascotas activas**.
- Las mascotas activas te acompañan en la partida.

### Guía de Mascotas
En el menú principal:
- Lista completa de mascotas con stats y costo.
- **10 sinergias** documentadas con descripción del bonus.

### Mejoras nuevas

| Mejora | Efecto | Máx |
|---|---|---|
| Rebote | Las balas rebotan 1 vez en paredes | 1 |
| Aura Gélida | Enemigos cerca se mueven 20% más lento | 2 |
| Codicia | Los enemigos sueltan +1 moneda | 3 |
| Adrenalina | +20% velocidad con <50% HP | 2 |
| Venganza | Devuelves 1 de daño al recibir golpe | 2 |
| Último Aliento | Sobrevives con 1 HP una vez por piso | 1 |

### Sinergias de mascotas

| Combinación | Sinergia | Efecto |
|---|---|---|
| Perro + Lobo | Manada | Ambos hacen +1 de daño |
| Gato + Búho | Cazadores Nocturnos | Rango de ataque +25% |
| Dragón + Fénix | Alas de Fuego | Golpear enemigos causa quemadura |
| Conejo + Zorro | Astucia | Velocidad +15% |
| Serpiente + Tigre | Emboscada | Primer golpe +2 de daño |
| Oso + Dragón | Colosos | +3 HP máx a ambas mascotas |
| Cuervo + Fénix | Renacer | Reviven 25% más rápido |
| Perro + Gato | Mascotas Domésticas | +2 HP máx a ambas |
| Lobo + Tigre | Fieras | Velocidad de ataque +20% |
| Búho + Serpiente | Sigilo | Rango de ataque +15% |

### Controles

| Tecla | Acción |
|---|---|
| WASD / Flechas | Moverse |
| Click izquierdo | Disparar (automático si se mantiene) |
| Click derecho / F | Cuchillo cuerpo a cuerpo |
| R | Recargar |
| E | Interactuar (recoger arma/abrir cofre/bajar piso) |
| Q / Tab / Rueda | Cambiar arma |
| 1 / 2 / 3 | Seleccionar arma directo |
| Escape | Pausa (con opción de ver mejoras) |

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ SUPABASE_URL et SUPABASE_KEY doivent être définies en variables d'environnement.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
    console.error("❌ ADMIN_PASSWORD doit être défini en variable d'environnement.");
    process.exit(1);
}

/* ============================================================
   OBJET ET POUVOIRS
============================================================ */

const POWER_IDS = [
    "spotlight",
    "freeze",
    "joker",
    "nova",
    "quake",
    "micro",
    "eclipse",
    "chaos"
];

const ITEM_CATALOG = {
    // Pouvoirs consommables : boutique + pass
    spotlight: { sources: ["shop", "pass"], type: "power", price: 300 },
    freeze: { sources: ["shop", "pass"], type: "power", price: 700 },
    joker: { sources: ["shop", "pass"], type: "power", price: 1200 },
    nova: { sources: ["shop", "pass"], type: "power", price: 2500 },
    quake: { sources: ["shop", "pass"], type: "power", price: 400 },
    micro: { sources: ["shop", "pass"], type: "power", price: 800 },
    eclipse: { sources: ["shop", "pass"], type: "power", price: 1500 },
    chaos: { sources: ["shop", "pass"], type: "power", price: 4000 },

    // Cosmétiques boutique
    theme_glacial: { sources: ["shop"], type: "theme", price: 1200, permanent: true },
    frame_voltage: { sources: ["shop"], type: "frame", price: 2200, permanent: true },
    frame_obsidian: { sources: ["shop"], type: "frame", price: 4500, permanent: true },

    // Cosmétiques pass
    theme_alt: { sources: ["pass"], type: "theme", permanent: true },
    frame_chroma: { sources: ["pass"], type: "frame", permanent: true },
    frame_prism: { sources: ["pass"], type: "frame", permanent: true },
    frame_silver: { sources: ["pass"], type: "frame", permanent: true },

    // Avatars pass
    avatar_lottie_palier15: { sources: ["pass"], type: "avatar", permanent: true },
    avatar_lottie_palier30: { sources: ["pass"], type: "avatar", permanent: true },

    // Titres pass
    title_champion: { sources: ["pass"], type: "title", permanent: true },
    title_stalker: { sources: ["pass"], type: "title", permanent: true },
    title_felin: { sources: ["pass"], type: "title", permanent: true },
    title_neon: { sources: ["pass"], type: "title", permanent: true },
    title_spectre: { sources: ["pass"], type: "title", permanent: true },
    title_supreme: { sources: ["pass"], type: "title", permanent: true }
};

function hasSource(itemId, source) {
    const item = ITEM_CATALOG[itemId];
    return !!(
        item &&
        Array.isArray(item.sources) &&
        item.sources.includes(source)
    );
}

function isShopItem(itemId) {
    return hasSource(itemId, "shop");
}

function isPassItem(itemId) {
    return hasSource(itemId, "pass");
}

function getCosmeticCategory(itemId) {
    const item = ITEM_CATALOG[itemId];

    if (item && ["theme", "frame", "avatar", "title"].includes(item.type)) {
        return item.type;
    }

    if (itemId.startsWith("avatar_")) return "avatar";
    if (itemId.startsWith("frame_")) return "frame";
    if (itemId.startsWith("title_")) return "title";
    if (itemId.startsWith("theme_")) return "theme";

    return null;
}

function countLoadout(loadout) {
    const counts = {};

    for (const itemId of loadout || []) {
        counts[itemId] = (counts[itemId] || 0) + 1;
    }

    return counts;
}

function validateLoadout(socketId, rawLoadout, minSlots, maxSlots) {
    const player = activePlayers[socketId];
    if (!player) return null;

    let items = [];

    if (Array.isArray(rawLoadout)) {
        items = rawLoadout;
    } else if (rawLoadout && Array.isArray(rawLoadout.items)) {
        items = rawLoadout.items;
    }

    // Garder uniquement les pouvoirs valides
    items = items.filter(itemId => POWER_IDS.includes(itemId));

    if (items.length < minSlots || items.length > maxSlots) {
        return null;
    }

    const needed = countLoadout(items);

    for (const itemId in needed) {
        const owned = player.inventory[itemId] || 0;

        if (owned < needed[itemId]) {
            return null;
        }
    }

    return items;
}

/* ============================================================
   ÉTAT SERVEUR
============================================================ */

const activePlayers = {};
const rooms = {};
const matchmakingQueue = [];
const rankedQueue = [];
let tugOfWarQueue = [];

const activeMatches = {};
const lastMatchEarnings = {};
const pendingLoadouts = {};
const soloSessions = {};

let globalEvents = {
    coinRush: false,
    rankShield: false,
    expressoMatch: false,
    chaosMode: false,
    jackpotEclair: false,
    tugOfWarMode: false
};

let eventSchedules = {
    coinRush: { manual: false, start: null, end: null },
    rankShield: { manual: false, start: null, end: null },
    expressoMatch: { manual: false, start: null, end: null },
    chaosMode: { manual: false, start: null, end: null },
    jackpotEclair: { manual: false, start: null, end: null },
    tugOfWarMode: { manual: false, start: null, end: null }
};

setInterval(() => {
    const now = Date.now();
    let changed = false;

    for (let key in eventSchedules) {
        const ev = eventSchedules[key];
        let shouldBeActive = ev.manual;

        if (ev.start && ev.end) {
            if (now >= ev.start && now <= ev.end) shouldBeActive = true;
        }

        if (globalEvents[key] !== shouldBeActive) {
            globalEvents[key] = shouldBeActive;
            changed = true;
        }
    }

    if (changed) io.emit("events_state_update", globalEvents);
}, 5000);

app.get("/", (req, res) => {
    res.send("Chiffre Blitz Server is running ⚡");
});

async function savePlayerToSupabase(socketId) {
    const p = activePlayers[socketId];
    if (!p) return;

    await supabase
        .from("players")
        .update({
            points: p.points,
            coins: p.coins,
            trophies: p.trophies,
            wins: p.wins,
            losses: p.losses,
            inventory: p.inventory,
            equipped_power: p.equippedPower,
            region: p.region,
            country: p.country || "FR",
            avatar: p.avatar,
            flag: p.flag,
            unlocked_items: p.unlocked_items,
            blitz_pass_premium: p.blitzPassPremium,
            claimed_pass_tiers: p.claimedPassTiers
        })
        .eq("id", p.dbId);
}

/* ============================================================
   SOCKET
============================================================ */

io.on("connection", (socket) => {
    console.log(`🔌 Un utilisateur s'est connecté : ${socket.id}`);

    socket.emit("events_state_update", globalEvents);

    socket.on("get_item_catalog", () => {
        socket.emit("item_catalog", ITEM_CATALOG);
    });

    /* ============================================================
       PROFIL / SUPABASE
    ============================================================ */

    socket.on("register_player", async (data) => {
        const rawUsername = data.username ? data.username.trim() : "Joueur";

        try {
            let { data: matchedPlayers, error } = await supabase
                .from("players")
                .select("*")
                .ilike("username", rawUsername);

            let dbPlayer = matchedPlayers && matchedPlayers.length > 0 ? matchedPlayers[0] : null;
            let playerData;

            if (error || !dbPlayer) {
                const newRecord = {
                    username: rawUsername,
                    region: data.region || "Hauts-de-France",
                    country: data.country || "FR",
                    avatar: data.avatar || 1,
                    flag: data.flag || "🇫🇷",
                    points: 0,
                    coins: 100,
                    trophies: 0,
                    wins: 0,
                    losses: 0,
                    inventory: {},
                    equipped_power: null,
                    unlocked_items: [],
                    blitz_pass_premium: false,
                    claimed_pass_tiers: {}
                };

                const { data: inserted, error: insertErr } = await supabase
                    .from("players")
                    .insert([newRecord])
                    .select()
                    .single();

                if (!insertErr && inserted) {
                    playerData = inserted;
                } else {
                    playerData = { ...newRecord, id: socket.id };
                }
            } else {
                playerData = dbPlayer;

                const { data: updated } = await supabase
                    .from("players")
                    .update({
                        region: data.region || dbPlayer.region,
                        avatar: data.avatar || dbPlayer.avatar,
                        flag: data.flag || dbPlayer.flag
                    })
                    .eq("id", dbPlayer.id)
                    .select()
                    .single();

                if (updated) playerData = updated;
            }

            activePlayers[socket.id] = {
                socketId: socket.id,
                dbId: playerData.id || socket.id,
                id: socket.id,
                username: playerData.username,
                region: playerData.region,
                country: playerData.country || "FR",
                avatar: playerData.avatar,
                flag: playerData.flag,
                points: playerData.points || 0,
                coins: playerData.coins || 0,
                trophies: playerData.trophies || 0,
                wins: playerData.wins || 0,
                losses: playerData.losses || 0,
                inventory: playerData.inventory || {},
                equippedPower: playerData.equipped_power || null,
                equippedPowers: [],
                unlocked_items: playerData.unlocked_items || [],
                blitzPassPremium: playerData.blitz_pass_premium || false,
                claimedPassTiers: playerData.claimed_pass_tiers || {}
            };

            socket.emit("player_registered", activePlayers[socket.id]);
        } catch (err) {
            console.error("Erreur lors de l'enregistrement Supabase :", err);
        }
    });

    /* ============================================================
       BOUTIQUE
    ============================================================ */

    socket.on("buy_item", async (itemId) => {
        const player = activePlayers[socket.id];
        if (!player) return;

        const item = ITEM_CATALOG[itemId];

        if (!item || !isShopItem(itemId)) {
            socket.emit("room_error", "Cet objet ne peut pas être acheté dans la boutique.");
            return;
        }

        const cost = item.price;

        if (typeof cost !== "number" || player.coins < cost) {
            socket.emit("room_error", "Tu n'as pas assez de pièces 🪙 !");
            return;
        }

        player.inventory = player.inventory || {};
        player.unlocked_items = player.unlocked_items || [];

        // Pouvoirs consommables
        if (item.type === "power") {
            player.coins -= cost;
            player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
        }

        // Cosmétiques permanents
        else if (item.permanent) {
            if (player.unlocked_items.includes(itemId)) {
                socket.emit("room_error", "Tu possèdes déjà cet objet.");
                return;
            }

            player.coins -= cost;
            player.unlocked_items.push(itemId);
        }

        else {
            return;
        }

        await savePlayerToSupabase(socket.id);
        socket.emit("player_registered", player);
    });

    socket.on("equip_power", async (powerId) => {
        const player = activePlayers[socket.id];
        if (!player) return;

        if (!POWER_IDS.includes(powerId)) return;

        if ((player.inventory[powerId] || 0) > 0) {
            player.equippedPower = powerId;
            await savePlayerToSupabase(socket.id);
            socket.emit("player_registered", player);
        }
    });

    socket.on("equip_cosmetic", async (itemId) => {
        const player = activePlayers[socket.id];
        if (!player) return;

        if (!player.inventory) player.inventory = {};
        if (!player.inventory.__equipped) player.inventory.__equipped = {};

        if (itemId === "none" || itemId === "standard" || !itemId) {
            delete player.inventory.__equipped.avatar;
        } else if (itemId === "none_title") {
            delete player.inventory.__equipped.title;
        } else if (itemId === "none_frame") {
            delete player.inventory.__equipped.frame;
        } else if (itemId === "none_theme") {
            delete player.inventory.__equipped.theme;
        } else {
            const category = getCosmeticCategory(itemId);
            const owned = (player.unlocked_items || []).includes(itemId);

            if (!category || !owned) {
                socket.emit("room_error", "Tu ne possèdes pas cet objet cosmétique.");
                return;
            }

            player.inventory.__equipped[category] = itemId;
        }

        await savePlayerToSupabase(socket.id);
        socket.emit("player_registered", player);
    });

    /* ============================================================
       PASS DE SAISON
    ============================================================ */

    socket.on("buy_blitz_pass", async () => {
        const player = activePlayers[socket.id];
        if (!player || player.blitzPassPremium) return;

        const cost = 1000;

        if (player.coins >= cost) {
            player.coins -= cost;
            player.blitzPassPremium = true;

            await savePlayerToSupabase(socket.id);

            socket.emit("player_registered", player);
            socket.emit("blitz_pass_updated", {
                coins: player.coins,
                blitzPassPremium: player.blitzPassPremium,
                claimedPassTiers: player.claimedPassTiers
            });

            socket.emit("admin_gift_received", {
                message: "🎉 Passe de Combat Premium activé avec succès !"
            });
        } else {
            socket.emit("room_error", "Tu n'as pas assez de pièces 🪙 !");
        }
    });

    socket.on("claim_pass_tier", async (data) => {
        const player = activePlayers[socket.id];
        if (!player) return;

        const { tier, track } = data;

        player.claimedPassTiers = player.claimedPassTiers || {};

        const key = `${tier}_${track}`;

        if (player.claimedPassTiers[key]) return;
        if (track === "premium" && !player.blitzPassPremium) return;

        player.claimedPassTiers[key] = true;
        applyPassReward(player, tier, track);

        await savePlayerToSupabase(socket.id);

        socket.emit("player_registered", player);
        socket.emit("blitz_pass_updated", {
            coins: player.coins,
            blitzPassPremium: player.blitzPassPremium,
            claimedPassTiers: player.claimedPassTiers
        });

        socket.emit("admin_gift_received", {
            message: `🎁 Récompense du Palier ${tier} (${track}) enregistrée !`
        });
    });

    /* ============================================================
       LOADOUT / MATCHMAKING
    ============================================================ */

    // Solo : 0 ou 1 objet
    socket.on("start_solo_training", (data) => {
        const mode = data && data.mode ? data.mode : "classic";
        const rawLoadout = data && data.loadout ? data.loadout : [];

        const validLoadout = validateLoadout(socket.id, rawLoadout, 0, 1);

        if (!validLoadout) {
            socket.emit("room_error", "Entraînement : maximum 1 objet autorisé.");
            return;
        }

        soloSessions[socket.id] = {
            mode,
            loadout: validLoadout,
            remainingCharges: countLoadout(validLoadout),
            startedAt: Date.now(),
            rewarded: false
        };

        socket.emit("solo_session_started", {
            mode,
            loadout: validLoadout,
            remainingCharges: soloSessions[socket.id].remainingCharges
        });
    });

    // 1v1 normal : 0 ou 1 objet
    socket.on("find_1v1_match", (rawLoadout) => {
        const validLoadout = validateLoadout(socket.id, rawLoadout, 0, 1);

        if (!validLoadout) {
            socket.emit("room_error", "Duel 1v1 : maximum 1 objet autorisé.");
            return;
        }

        pendingLoadouts[socket.id] = validLoadout;
        matchmakingQueue.push(socket.id);

        if (matchmakingQueue.length >= 2) {
            startMatchBetween(
                matchmakingQueue.shift(),
                matchmakingQueue.shift(),
                false,
                true,
                false
            );
        }
    });

    // Classé : exactement 2 objets
    socket.on("find_ranked_match", (data) => {
        const validLoadout = validateLoadout(socket.id, data, 2, 2);

        if (!validLoadout) {
            socket.emit("room_error", "En mode classé, tu dois équiper exactement 2 objets valides.");
            return;
        }

        pendingLoadouts[socket.id] = validLoadout;

        if (activePlayers[socket.id]) {
            activePlayers[socket.id].equippedPowers = validLoadout;
            activePlayers[socket.id].equippedPower = validLoadout[0];
        }

        rankedQueue.push(socket.id);

        if (rankedQueue.length >= 2) {
            startMatchBetween(
                rankedQueue.shift(),
                rankedQueue.shift(),
                true,
                true,
                false
            );
        }
    });

    // Tug-of-War : 0 ou 1 objet
    socket.on("find_tug_of_war_match", (rawLoadout) => {
        if (!globalEvents.tugOfWarMode) return;

        const validLoadout = validateLoadout(socket.id, rawLoadout, 0, 1);

        if (!validLoadout) {
            socket.emit("room_error", "Mode spécial : maximum 1 objet autorisé.");
            return;
        }

        pendingLoadouts[socket.id] = validLoadout;

        tugOfWarQueue = tugOfWarQueue.filter(sId => sId !== socket.id);
        tugOfWarQueue.push(socket.id);

        if (tugOfWarQueue.length >= 2) {
            startMatchBetween(
                tugOfWarQueue.shift(),
                tugOfWarQueue.shift(),
                false,
                true,
                true
            );
        }
    });

    /* ============================================================
       UTILISATION DES POUVOIRS
    ============================================================ */

    socket.on("use_power", async (powerId) => {
        const player = activePlayers[socket.id];
        if (!player) return;

        if (!POWER_IDS.includes(powerId)) return;

        const match = activeMatches[socket.id];

        // Match online
        if (match && !match.ended) {
            const pData = match.players[socket.id];
            if (!pData) return;

            pData.remainingCharges = pData.remainingCharges || {};

            if ((pData.remainingCharges[powerId] || 0) <= 0) {
                socket.emit("room_error", "Tu n'as plus cet objet disponible dans cette partie.");
                return;
            }

            if ((player.inventory[powerId] || 0) <= 0) {
                socket.emit("room_error", "Tu ne possèdes plus cet objet.");
                return;
            }

            pData.remainingCharges[powerId]--;
            player.inventory[powerId]--;

            await savePlayerToSupabase(socket.id);

            socket.emit("player_registered", player);
            socket.emit("power_used_success", {
                powerId,
                remaining: pData.remainingCharges[powerId]
            });

            const MALUS_POWERS = ["quake", "micro", "eclipse", "chaos"];

            if (MALUS_POWERS.includes(powerId)) {
                const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
                io.to(oppId).emit("receive_malus", { type: powerId });
            }

            return;
        }

        // Solo training
        const solo = soloSessions[socket.id];

        if (solo && !solo.rewarded) {
            solo.remainingCharges = solo.remainingCharges || {};

            if ((solo.remainingCharges[powerId] || 0) <= 0) {
                socket.emit("room_error", "Tu n'as plus cet objet disponible dans cet entraînement.");
                return;
            }

            if ((player.inventory[powerId] || 0) <= 0) {
                socket.emit("room_error", "Tu ne possèdes plus cet objet.");
                return;
            }

            solo.remainingCharges[powerId]--;
            player.inventory[powerId]--;

            await savePlayerToSupabase(socket.id);

            socket.emit("player_registered", player);
            socket.emit("power_used_success", {
                powerId,
                remaining: solo.remainingCharges[powerId]
            });
        }
    });

    // Désactivé car les malus sont maintenant envoyés automatiquement par use_power
    socket.on("send_malus", () => {});

    /* ============================================================
       RÉCOMPENSES SOLO
    ============================================================ */

    socket.on("claim_solo_reward", async (score) => {
        const player = activePlayers[socket.id];
        if (!player) return;

        const session = soloSessions[socket.id];

        if (!session || session.rewarded) return;

        const elapsed = Date.now() - session.startedAt;

        // Sécurité minimale : une partie solo ne peut pas être récompensée instantanément
        if (elapsed < 5000) return;

        const normalizedScore = Number(score);

        if (!Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 20000) {
            return;
        }

        session.rewarded = true;

        let baseCoins = Math.min(100, Math.floor(normalizedScore / 3));
        let rushBonus = globalEvents.coinRush ? baseCoins : 0;
        let earnedCoins = baseCoins + rushBonus;

        player.coins += earnedCoins;
        lastMatchEarnings[socket.id] = earnedCoins;

        // 10% si Jackpot Éclair actif
        let triggerWheel = (globalEvents.jackpotEclair && Math.random() < 0.10);

        await savePlayerToSupabase(socket.id);

        socket.emit("player_registered", player);
        socket.emit("solo_reward_result", {
            baseCoins,
            rushBonus,
            earnedCoins,
            triggerWheel,
            globalEvents
        });

        delete soloSessions[socket.id];
    });

    socket.on("double_reward", async () => {
        const player = activePlayers[socket.id];
        if (!player) return;

        const earnings = lastMatchEarnings[socket.id] || 0;

        if (earnings > 0) {
            player.coins += earnings;
            lastMatchEarnings[socket.id] = 0;

            await savePlayerToSupabase(socket.id);
            socket.emit("player_registered", player);
        }
    });

    /* ============================================================
       ROUE JACKPOT
    ============================================================ */

    socket.on("spin_jackpot_wheel", async () => {
        const player = activePlayers[socket.id];
        if (!player) return;

        const roll = Math.random();

        let outcome = "rien";
        let coinDelta = 0;
        let itemId = null;

        const possiblePowerRewards = ["spotlight", "freeze", "joker", "quake"];

        if (roll < 0.30) {
            outcome = "jackpot";
            coinDelta = 250;
        } else if (roll < 0.45) {
            outcome = "objet";
            itemId = possiblePowerRewards[Math.floor(Math.random() * possiblePowerRewards.length)];
            player.inventory = player.inventory || {};
            player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
        } else if (roll < 0.70) {
            outcome = "banqueroute";
            coinDelta = -150;
        } else {
            outcome = "rien";
            coinDelta = 0;
        }

        if (coinDelta < 0) {
            player.coins = Math.max(0, player.coins + coinDelta);
        } else {
            player.coins += coinDelta;
        }

        lastMatchEarnings[socket.id] = (lastMatchEarnings[socket.id] || 0) + coinDelta;

        await savePlayerToSupabase(socket.id);

        socket.emit("player_registered", player);
        socket.emit("jackpot_wheel_result", {
            outcome,
            coinDelta,
            itemId,
            newCoins: player.coins
        });
    });

    /* ============================================================
       CLASSEMENT
    ============================================================ */

    socket.on("get_leaderboard", async (type) => {
        try {
            const [category, scope] = type.split("_");

            let query = supabase.from("players").select("*");

            const player = activePlayers[socket.id];

            if (scope === "regional" && player) {
                query = query.eq("region", player.region);
            }

            if (scope === "national" && player) {
                const myCountry = player.country || "FR";
                query = query.eq("country", myCountry);
            }

            if (category === "points") {
                query = query.order("points", { ascending: false });
            } else if (category === "trophies") {
                query = query.order("trophies", { ascending: false });
            } else if (category === "coins") {
                query = query.order("coins", { ascending: false });
            } else if (category === "combined") {
                query = query.order("trophies", { ascending: false }).order("points", { ascending: false });
            }

            const { data: sortedData, error } = await query.limit(50);

            if (!error && sortedData) {
                socket.emit("leaderboard_data", { type, data: sortedData });
            } else {
                socket.emit("leaderboard_data", { type, data: [] });
            }
        } catch (err) {
            console.error("Erreur récupération classement Supabase :", err);
            socket.emit("leaderboard_data", { type, data: [] });
        }
    });

    /* ============================================================
       SALONS
    ============================================================ */

    socket.on("get_rooms_list", () => {
        const openRooms = Object

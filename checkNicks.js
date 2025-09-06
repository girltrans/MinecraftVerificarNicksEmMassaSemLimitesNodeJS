import fetch from "node-fetch";
import fs from "fs";
import readline from "readline";
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve =>
        rl.question(query, answer => {
            rl.close();
            resolve(answer);
        })
    );
}
function gerarCombinacoes(charset, length) {
    let results = [];
    function helper(prefix, depth) {
        if (depth === 0) {
            results.push(prefix);
            return;
        }
        for (let char of charset) {
            helper(prefix + char, depth - 1);
        }
    }
    helper("", length);
    return results;
}
async function fetchWithLimit(urls, limit = 1000000000000) {
    let results = new Array(urls.length);
    let i = 0;
    async function worker() {
        while (i < urls.length) {
            const current = i++;
            const url = urls[current];
            try {
                const res = await fetch(url);
                results[current] = res;
            } catch {
                results[current] = null;
            }
        }
    }
    const workers = Array.from({ length: limit }, worker);
    await Promise.all(workers);
    return results;
}
async function verificacaoMassa(count = 3, tipo = 2, porSegundo = 1000000000000) {
    let charset = "";
    if (tipo === 1) charset = "0123456789";
    else if (tipo === 2) charset = "abcdefghijklmnopqrstuvwxyz";
    else if (tipo === 3) charset = "abcdefghijklmnopqrstuvwxyz_";
    else if (tipo === 4) charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    else if (tipo === 5) charset = "abcdefghijklmnopqrstuvwxyz0123456789_";
    const combos = gerarCombinacoes(charset, count);
    console.log(`⏳ Verificando ${combos.length} combinações (${porSegundo} requisições por segundo)...`);
    const urls = combos.map(nick => `https://playerdb.co/api/player/minecraft/${nick}`);
    const responses = await fetchWithLimit(urls, porSegundo);
    let disponiveis = [];
    for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        const nick = combos[i];
        if (!res) continue;
        if (res.status === 400 || res.status === 500) {
            disponiveis.push(nick);
        } else if (res.ok) {
            try {
                const text = await res.text();
                if (!text.includes('"player.found"')) {
                    disponiveis.push(nick);
                }
            } catch {}
        }
    }
    if (disponiveis.length > 0) {
        console.log(`✅ Nicks disponíveis (${disponiveis.length}):`);
        console.log(disponiveis.join("\n"));
        fs.writeFileSync("disponiveis.txt", disponiveis.join("\n"), "utf8");
        console.log("💾 Lista salva em disponiveis.txt");
    } else {
        console.log("❌ Nenhum nick disponível encontrado.");
    }
}
async function main() {
    let [,, argCount, argTipo, argRate] = process.argv;
    let count = parseInt(argCount);
    let tipo = parseInt(argTipo);
    let porSegundo = parseInt(argRate);
    if (!count || count < 1 || count > 16) {
        count = parseInt(await askQuestion("Quantos caracteres? (1-16): "));
    }
    if (!tipo || tipo < 1 || tipo > 5) {
        console.log("Tipo de caracteres:\n1) Apenas números (0-9)\n2) Apenas letras (a-z)\n3) Letras + underscore (a-z, _)\n4) Letras + números (a-z, 0-9)\n5) Letras + números + underscore (a-z, 0-9, _)");
        tipo = parseInt(await askQuestion("Escolha o tipo (1-5): "));
    }
    if (!porSegundo || porSegundo < 1 || porSegundo > 1000000000000) {
        porSegundo = parseInt(await askQuestion("Verificar Quantas Por Segundo? (Limite 1 Trilhão Por Segundo, Recomendado 100000):"));
    }
    await verificacaoMassa(count, tipo, porSegundo);
}
main();
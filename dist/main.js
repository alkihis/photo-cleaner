"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const glob_1 = __importDefault(require("glob"));
const md5_file_1 = __importDefault(require("md5-file"));
const progress_1 = __importDefault(require("progress"));
const helpers_1 = require("./helpers");
// Saute une ligne
console.log("");
// Parsage des arguments
if (process.argv.length < 4) {
    console.error("Arguments requis manquants.");
    console.error("Usage: npm start [srcFolder] [destFolder] [deleteSourceAfterCopy: true | (false)]\n");
    process.exit();
}
const src = process.argv[2];
const dest = process.argv[3];
let delete_after = false;
let copy_mode = false;
if (process.argv.length > 4 && process.argv[4] === "copy") {
    copy_mode = true;
}
if (process.argv.length > 5 && process.argv[5] === "true") {
    delete_after = true;
}
if (!fs_1.default.existsSync(src)) {
    console.error("Le dossier source doit exister.\n");
    process.exit();
}
if (!fs_1.default.existsSync(dest)) {
    console.log("Création automatique du dossier de destination.\n");
    fs_1.default.mkdirSync(dest);
    if (!fs_1.default.existsSync(dest)) {
        console.error("Impossible de créer le dossier de destination.\n");
        process.exit();
    }
}
const files = {};
const exts = helpers_1.initExts();
// Recherche de tous les fichiers image: .jpg, .jpeg, .png et tous les fichiers vidéo: mp4, avi, mov
console.log("Identification des fichiers...");
const all_files = [];
for (const e in exts) {
    for (const ext of exts[e]) {
        for (const file of glob_1.default.sync(src + "/**/*." + ext)) {
            all_files.push([file, e]);
        }
    }
}
const first_bar = new progress_1.default(':current/:total calculé [:bar] :percent', { total: all_files.length, incomplete: ".", head: ">", clear: true });
for (const f of all_files) {
    // On peut afficher une barre de progression ici
    helpers_1.registerFile(files, f[0], f[1]);
    first_bar.tick();
}
first_bar.terminate();
// Copie ou déplacement vers la destination
const count_file = Object.keys(files).length;
console.log(`${count_file === 0 ? "Aucun" : count_file} fichier${count_file > 1 ? "s" : ''} trouvé${count_file > 1 ? "s" : ''}.\n`);
if (count_file === 0) {
    process.exit();
}
async function launchCopy() {
    const bar = new progress_1.default(':current/:total ' + (copy_mode ? "copié" : "déplacé") + ' [:bar] :percent :etas', { total: count_file, incomplete: ".", head: ">", clear: true });
    const promises = [];
    for (const hash in files) {
        const file = files[hash];
        const year = file.mtime.getFullYear();
        const month = helpers_1.getTextualMonth(file.mtime.getMonth() + 1);
        const folder = dest + "/" + year + "/" + month + (file.type === helpers_1.FileType.video ? "/Vidéos" : "");
        if (!fs_1.default.existsSync(folder)) {
            fs_1.default.mkdirSync(folder, { recursive: true });
        }
        if (fs_1.default.existsSync(folder + "/" + file.baseName)) {
            const md5 = md5_file_1.default.sync(folder + "/" + file.baseName);
            if (md5 !== hash) {
                let newbasename = "";
                while (!newbasename) {
                    // C'est pas le même fichier !
                    // On modifie le nom du fichier
                    const newfn = file.fullName.split('.');
                    newfn[newfn.length - 2] += helpers_1.getHexCode();
                    const newfilename = newfn.join('.');
                    newbasename = newfilename.split('/').pop();
                    if (fs_1.default.existsSync(folder + "/" + newbasename)) {
                        newbasename = "";
                    }
                    else {
                        file.baseName = newbasename;
                    }
                }
            }
            else {
                // Sinon, pas de copie !
                continue;
            }
        }
        // C'est safe ! On copie
        if (copy_mode) {
            promises.push(helpers_1.copyFile(file.fullName, folder + "/" + file.baseName).then(() => { bar.tick(); }));
        }
        else {
            promises.push(helpers_1.moveFile(file.fullName, folder + "/" + file.baseName).then(() => { bar.tick(); }));
        }
    }
    try {
        await Promise.all(promises);
        bar.terminate();
        if (delete_after) {
            console.log("Suppression des fichiers dans le dossier source.\n");
            helpers_1.deleteFolderRecursive(src, false);
        }
        console.log("Vos médias ont bien été triés et " + (copy_mode ? "copiés" : "déplacés") + ".\n");
    }
    catch (err) {
        bar.terminate();
        console.error("Une erreur est survenue lors de la copie de vos fichiers.\n", err);
    }
}
launchCopy();

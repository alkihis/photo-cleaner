import fs from 'fs';
import glob from 'glob';
import md5File from 'md5-file';
import ProgressBar from 'progress';
import { deleteFolderRecursive, MediaFiles, registerFile, getTextualMonth, moveFile, getHexCode, FileType, Extensions, initExts, sleep, copyFile } from './helpers';

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

if (!fs.existsSync(src)) {
    console.error("Le dossier source doit exister.\n");
    process.exit();
}

if (!fs.existsSync(dest)) {
    console.log("Création automatique du dossier de destination.\n");
    fs.mkdirSync(dest);

    if (!fs.existsSync(dest)) {
        console.error("Impossible de créer le dossier de destination.\n");
        process.exit();
    }
}

const files: MediaFiles = {};

const exts: Extensions = initExts();

// Recherche de tous les fichiers image: .jpg, .jpeg, .png et tous les fichiers vidéo: mp4, avi, mov
console.log("Identification des fichiers...");

const all_files: [string, string][] = [];

for (const e in exts) {
    for (const ext of exts[e as FileType]) {
        for (const file of glob.sync(src + "/**/*." + ext)) {
            all_files.push([file, e]);
        }
    }
}

const first_bar = new ProgressBar(':current/:total calculé [:bar] :percent', { total: all_files.length, incomplete: ".", head: ">", clear: true });

for (const f of all_files) {
    // On peut afficher une barre de progression ici
    registerFile(files, f[0], f[1] as FileType);
    first_bar.tick();
}

first_bar.terminate();

// Copie ou déplacement vers la destination
const count_file = Object.keys(files).length;
console.log(`${count_file === 0 ? "Aucun" : count_file} fichier${count_file > 1 ? "s" : ''} unique${count_file > 1 ? "s" : ''} trouvé${count_file > 1 ? "s" : ''}.\n`);

if (count_file === 0) {
    process.exit();
}

async function launchCopy() {
    const bar = new ProgressBar(':current/:total ' + (copy_mode ? "copié" : "déplacé") + ' [:bar] :percent :etas', { total: count_file, incomplete: ".", head: ">", clear: true });

    const promises: Promise<void>[] = [];

    for (const hash in files) {
        const file = files[hash];
    
        const year = file.mtime.getFullYear();
        const month = getTextualMonth(file.mtime.getMonth() + 1);
    
        const folder = dest + "/" + year + "/" + month + (file.type === FileType.video ? "/Vidéos" : "");
    
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
    
        if (fs.existsSync(folder + "/" + file.baseName)) {
            const md5 = md5File.sync(folder + "/" + file.baseName);
    
            if (md5 !== hash) {
                let newbasename: string = "";
    
                while (!newbasename) {
                    // C'est pas le même fichier !
                    // On modifie le nom du fichier
                    const newfn = file.fullName.split('.');
                    newfn[newfn.length - 2] += getHexCode();
                    const newfilename = newfn.join('.');
                    newbasename = newfilename.split('/').pop() as string;
    
                    if (fs.existsSync(folder + "/" + newbasename)) {
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
            promises.push(copyFile(file.fullName, folder + "/" + file.baseName).then(() => { bar.tick(); }));
        }
        else {
            promises.push(moveFile(file.fullName, folder + "/" + file.baseName).then(() => { bar.tick(); }));
        }
    }
    
    try {
        await Promise.all(promises);
        bar.terminate();

        if (delete_after) {
            console.log("Suppression des fichiers dans le dossier source.\n");

            deleteFolderRecursive(src, false);
        }

        console.log("Vos médias ont bien été triés et " + (copy_mode ? "copiés" : "déplacés") + ".\n");
    } catch (err) {
        bar.terminate();
        console.error("Une erreur est survenue lors de la copie de vos fichiers.\n", err);
    }
}

launchCopy();

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
const duplicates_1 = require("./duplicates");
async function parseFolders(src, dest, flags) {
    // Saute une ligne
    console.log("");
    // Parsage des arguments
    let delete_after = false;
    let copy_mode = false;
    let rm_duplications = "false";
    if (flags.copy) {
        copy_mode = true;
    }
    if (flags.deletesrc) {
        delete_after = true;
    }
    if (flags.duplicates) {
        rm_duplications = flags.duplicates;
    }
    if (!fs_1.default.existsSync(src)) {
        helpers_1.makeError("Source folder must exists.\n");
        process.exit();
    }
    if (!fs_1.default.existsSync(dest)) {
        helpers_1.makeWarn("Auto-creating destination folder.\n");
        fs_1.default.mkdirSync(dest);
        if (!fs_1.default.existsSync(dest)) {
            helpers_1.makeError("Unable to create destination folder. Please check your rights.\n");
            process.exit();
        }
    }
    const files = {};
    const exts = helpers_1.initExts();
    // Recherche de tous les fichiers image: .jpg, .jpeg, .png et tous les fichiers vidéo: mp4, avi, mov
    helpers_1.makeInfo("Looking for media files...");
    const all_files = [];
    for (const e in exts) {
        for (const ext of exts[e]) {
            for (const file of glob_1.default.sync(src + "/**/*." + ext)) {
                all_files.push([file, e]);
            }
        }
    }
    const first_bar = new progress_1.default(':current/:total computed [:bar] :percent ', { total: all_files.length, incomplete: ".", head: ">", clear: true });
    for (const f of all_files) {
        // On peut afficher une barre de progression ici
        await helpers_1.registerFile(files, f[0], f[1]);
        first_bar.tick();
    }
    first_bar.terminate();
    // Copie ou déplacement vers la destination
    const count_file = Object.keys(files).length;
    if (count_file === 0) {
        helpers_1.makeWarn(`No media file found.\n`);
    }
    else {
        helpers_1.makeInfo(`${count_file} unique media file${count_file > 1 ? "s" : ''} found.\n`);
    }
    if (count_file === 0) {
        process.exit();
    }
    launchCopy(src, dest, delete_after, copy_mode, files, count_file, rm_duplications);
}
exports.parseFolders = parseFolders;
async function launchCopy(src, dest, delete_after, copy_mode, files, count_file, remove_duplicates) {
    const bar = new progress_1.default(':current/:total ' + (copy_mode ? "copied" : "moved") + ' [:bar] :percent :etas ', { total: count_file, incomplete: ".", head: ">", clear: true });
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
                bar.tick();
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
            helpers_1.makeInfo("Delete files in source folder.\n");
            helpers_1.deleteFolderRecursive(src, false);
        }
        if (remove_duplicates !== "false") {
            await duplicates_1.removeDuplicates(dest, remove_duplicates);
        }
        helpers_1.makeSuccess("Your media files has been successfully " + (copy_mode ? "copied" : "moved") + ".\n");
    }
    catch (err) {
        bar.terminate();
        helpers_1.makeError("An error occured during copy operations.\n");
        console.error(err);
    }
}
exports.launchCopy = launchCopy;

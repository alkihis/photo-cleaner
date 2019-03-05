"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const progress_1 = __importDefault(require("progress"));
const glob_1 = __importDefault(require("glob"));
const md5_file_1 = __importDefault(require("md5-file"));
function removeDuplicates(folder, mode) {
    // Recherche de tous les fichiers disponibles dans la source
    console.log("Listing files inside destination folder.");
    const files = glob_1.default.sync(folder + "/**/*.*");
    console.log("Looking for duplicates...");
    const bar = new progress_1.default(':current/:total [:bar] :percent :etas', { total: files.length, incomplete: ".", head: ">", clear: true });
    const hash_to_filedate = {};
    let removed = 0;
    for (const filename of files) {
        const current_file_hash = md5_file_1.default.sync(filename);
        const current_file_date = fs_1.default.lstatSync(filename).mtime;
        if (current_file_hash in hash_to_filedate) {
            let to_remove = null;
            if (mode === "older") {
                // On doit garder le plus vieux et supprimer le second
                if (hash_to_filedate[current_file_hash][1].getTime() > current_file_date.getTime()) {
                    // Le fichier actuel est plus vieux (date plus petite) 
                    // On garde le fichier actuel
                    to_remove = hash_to_filedate[current_file_hash][0];
                    // On actualise les données de l'obj
                    hash_to_filedate[current_file_hash] = [filename, current_file_date];
                }
                else {
                    // On doit garder celui dans l'objet
                    to_remove = filename;
                }
            }
            else {
                // On doit garder le plus récent des deux et supprimer le plus vieux
                if (hash_to_filedate[current_file_hash][1].getTime() < current_file_date.getTime()) {
                    // Le fichier actuel est plus récent (date plus grande) 
                    // On garde le fichier actuel
                    to_remove = hash_to_filedate[current_file_hash][0];
                    // On actualise les données de l'obj
                    hash_to_filedate[current_file_hash] = [filename, current_file_date];
                }
                else {
                    // On doit garder celui dans l'objet
                    to_remove = filename;
                }
            }
            if (to_remove) {
                removed++;
                fs_1.default.unlinkSync(to_remove);
            }
        }
        else {
            // On enregistre le fichier actuel
            hash_to_filedate[current_file_hash] = [filename, current_file_date];
        }
        bar.tick();
    }
    bar.terminate();
    console.log("Duplicates has been successfully deleted (" + removed + " removed).\n");
}
exports.removeDuplicates = removeDuplicates;

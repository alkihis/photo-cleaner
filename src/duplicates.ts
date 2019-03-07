import fs from 'fs';
import ProgressBar from 'progress';
import glob from 'glob';
import { DuplicateMode, makeSuccess, makeInfo } from './helpers';
import md5File from 'md5-file';

export async function removeDuplicates(folder: string, mode: DuplicateMode) : Promise<void> {
    // Recherche de tous les fichiers disponibles dans la source
    makeInfo("Listing files inside destination folder.");

    const files = glob.sync(folder + "/**/*.*");

    makeInfo("Looking for duplicates...");

    const bar = new ProgressBar(':current/:total [:bar] :percent :etas ', { total: files.length, incomplete: ".", head: ">", clear: true });

    const hash_to_filedate: {[hash: string]: [string, Date]} = {};
    let removed = 0;
    let found = 0;

    for (const filename of files) {
        const current_file_hash = md5File.sync(filename);
        const current_file_date = fs.lstatSync(filename).mtime;

        if (current_file_hash in hash_to_filedate) {
            let to_remove: string | null = null;

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
                found++;

                await new Promise((resolve) => {
                    fs.unlink(to_remove as string, (err) => {
                        if (!err) removed++;
                        resolve();
                    });
                });
            }
        }
        else {
            // On enregistre le fichier actuel
            hash_to_filedate[current_file_hash] = [filename, current_file_date];
        }

        bar.tick();
    }

    bar.terminate();
    
    if (found) {
        makeInfo("No duplicate found.");
    }
    else {
        makeSuccess("Duplicates has been successfully deleted (" + found + " found, " + removed + " removed).\n");
    }
}
